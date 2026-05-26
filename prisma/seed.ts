import bcrypt from "bcryptjs";
import { prisma } from "../src/lib/db";
import {
  MATH_CURRICULUM,
  ENGLISH_CURRICULUM,
  skillKey,
} from "./curriculum-data";
import { lessonContent } from "./content";
import { getLearningResourcesForSkill } from "../src/lib/learning-library";

async function seedCurriculum(
  subjectSlug: string,
  subjectName: string,
  curriculum: typeof MATH_CURRICULUM,
) {
  const subject = await prisma.subject.upsert({
    where: { slug: subjectSlug },
    update: {
      description: `${subjectName} mastery curriculum for grades 1–12`,
    },
    create: {
      name: subjectName,
      slug: subjectSlug,
      description: `${subjectName} mastery curriculum for grades 1–12`,
    },
  });

  const trackDefs = [
    { id: "k2", gradeBand: "K2_FOUNDATION" as const, title: "Grades K–2", min: 1, max: 2 },
    { id: "3-5", gradeBand: "GRADES_3_5" as const, title: "Grades 3–5", min: 3, max: 5 },
    { id: "6-8", gradeBand: "GRADES_6_8" as const, title: "Grades 6–8", min: 6, max: 8 },
    { id: "9-10", gradeBand: "GRADES_9_10" as const, title: "Grades 9–10", min: 9, max: 10 },
    { id: "11-12", gradeBand: "GRADES_11_12" as const, title: "Grades 11–12", min: 11, max: 12 },
  ];

  const tracks = new Map<number, string>();
  for (const def of trackDefs) {
    const track = await prisma.curriculumTrack.upsert({
      where: { id: `${subjectSlug}-track-${def.id}` },
      update: {
        title: `${subjectName} ${def.title}`,
        gradeBand: def.gradeBand,
      },
      create: {
        id: `${subjectSlug}-track-${def.id}`,
        subjectId: subject.id,
        title: `${subjectName} ${def.title}`,
        description: `Core ${subjectName.toLowerCase()} skills for ${def.title.toLowerCase()}`,
        gradeBand: def.gradeBand,
        sequence: trackDefs.indexOf(def) + 1,
      },
    });
    for (let g = def.min; g <= def.max; g++) {
      tracks.set(g, track.id);
    }
  }

  const skillIdMap = new Map<string, string>(); // reserved for cross-level prerequisite wiring

  for (const levelDef of curriculum) {
    const trackId = tracks.get(levelDef.grade);
    if (!trackId) {
      throw new Error(`No track for grade ${levelDef.grade} in ${subjectSlug}`);
    }

    const level = await prisma.level.upsert({
      where: { id: `${subjectSlug}-level-${levelDef.grade}` },
      update: {
        curriculumTrackId: trackId,
        title: levelDef.title,
      },
      create: {
        id: `${subjectSlug}-level-${levelDef.grade}`,
        subjectId: subject.id,
        curriculumTrackId: trackId,
        nominalGradeLevel: levelDef.grade,
        sequence: levelDef.grade,
        title: levelDef.title,
        description: `${subjectName} skills for grade ${levelDef.grade}`,
        estimatedMonthsAheadOrBehind: 0,
      },
    });

    for (let si = 0; si < levelDef.skills.length; si++) {
      const skillDef = levelDef.skills[si];
      const id = skillKey(subjectSlug, levelDef.grade, skillDef.title);
      const skill = await prisma.skill.upsert({
        where: { id },
        update: {
          title: skillDef.title,
          description: skillDef.description,
          sequence: si + 1,
          targetMedianSeconds: skillDef.targetMedianSeconds ?? 30,
          minProblemsForMastery: skillDef.minProblems ?? 60,
          targetAccuracy: skillDef.fluency ? 0.95 : 0.9,
        },
        create: {
          id,
          subjectId: subject.id,
          levelId: level.id,
          title: skillDef.title,
          description: skillDef.description,
          nominalGradeLevel: levelDef.grade,
          prerequisiteSkillIdsJson: [],
          sequence: si + 1,
          difficulty: Math.max(1, Math.min(levelDef.grade - 1, 5)),
          targetAccuracy: skillDef.fluency ? 0.95 : 0.9,
          targetMedianSeconds: skillDef.targetMedianSeconds ?? 30,
          minProblemsForMastery: skillDef.minProblems ?? 60,
        },
      });
      skillIdMap.set(id, skill.id);

      const lesson = lessonContent(subjectSlug, skillDef.title, levelDef.grade);
      await prisma.lesson.upsert({
        where: { id: `${id}-lesson` },
        update: {
          title: lesson.title,
          content: lesson.content,
          workedExamplesJson: lesson.workedExamples,
          commonMistakesJson: lesson.commonMistakes,
          whyItMatters: lesson.whyItMatters,
        },
        create: {
          id: `${id}-lesson`,
          skillId: skill.id,
          title: lesson.title,
          content: lesson.content,
          workedExamplesJson: lesson.workedExamples,
          commonMistakesJson: lesson.commonMistakes,
          whyItMatters: lesson.whyItMatters,
        },
      });

      const resources = getLearningResourcesForSkill(skillDef.title);
      for (let vi = 0; vi < resources.length; vi++) {
        const r = resources[vi];
        await prisma.videoResource.upsert({
          where: { id: `${id}-video-${vi + 1}` },
          update: {
            title: r.title,
            provider: r.provider,
            url: r.url,
            durationSeconds: r.durationSeconds ?? 480,
            approvedByParent: true,
            notes: "Curated learning resource",
          },
          create: {
            id: `${id}-video-${vi + 1}`,
            skillId: skill.id,
            title: r.title,
            provider: r.provider,
            url: r.url,
            durationSeconds: r.durationSeconds ?? 480,
            gradeLevel: levelDef.grade,
            tagsJson: [skillDef.title, subjectSlug],
            approvedByParent: true,
            notes: "Curated learning resource",
          },
        });
      }
      // Problems are bulk-loaded via: npm run db:reseed-content
    }
  }

  // Set prerequisites within each level
  for (const levelDef of curriculum) {
    for (let si = 0; si < levelDef.skills.length; si++) {
      const id = skillKey(subjectSlug, levelDef.grade, levelDef.skills[si].title);
      const prereqs: string[] = [];
      if (si > 0) {
        prereqs.push(skillKey(subjectSlug, levelDef.grade, levelDef.skills[si - 1].title));
      }
      if (levelDef.grade > 1 && si === 0) {
        const prev = curriculum.find((l) => l.grade === levelDef.grade - 1);
        if (prev?.skills.length) {
          prereqs.push(
            skillKey(subjectSlug, levelDef.grade - 1, prev.skills[prev.skills.length - 1].title),
          );
        }
      }
      await prisma.skill.update({
        where: { id },
        data: { prerequisiteSkillIdsJson: [...new Set(prereqs)] },
      });
    }
  }

  return subject;
}

async function main() {
  console.log("Seeding TigerParent...");

  const passwordHash = await bcrypt.hash("demo1234", 10);

  const family = await prisma.organization.upsert({
    where: { id: "demo-family" },
    update: {},
    create: {
      id: "demo-family",
      name: "Demo Family",
      type: "FAMILY",
    },
  });

  const verifiedAt = new Date();

  const admin = await prisma.user.upsert({
    where: { email: "admin@tigerparent.local" },
    update: { emailVerified: verifiedAt },
    create: {
      email: "admin@tigerparent.local",
      name: "Admin User",
      password: passwordHash,
      role: "ADMIN",
      emailVerified: verifiedAt,
    },
  });

  const parent = await prisma.user.upsert({
    where: { email: "parent@tigerparent.local" },
    update: { emailVerified: verifiedAt },
    create: {
      email: "parent@tigerparent.local",
      name: "Demo Parent",
      password: passwordHash,
      role: "PARENT",
      familyId: family.id,
      emailVerified: verifiedAt,
    },
  });

  const mathSubject = await seedCurriculum("math", "Math", MATH_CURRICULUM);
  const englishSubject = await seedCurriculum("english", "English", ENGLISH_CURRICULUM);

  const students = [
    {
      id: "student-a",
      email: "studenta@tigerparent.local",
      name: "Alex Chen",
      displayName: "Alex",
      schoolGrade: 4,
    },
    {
      id: "student-b",
      email: "studentb@tigerparent.local",
      name: "Jordan Chen",
      displayName: "Jordan",
      schoolGrade: 6,
    },
  ];

  for (const s of students) {
    const user = await prisma.user.upsert({
      where: { email: s.email },
      update: { emailVerified: verifiedAt },
      create: {
        email: s.email,
        name: s.name,
        password: passwordHash,
        role: "STUDENT",
        familyId: family.id,
        emailVerified: verifiedAt,
      },
    });

    const profile = await prisma.studentProfile.upsert({
      where: { userId: user.id },
      update: {},
      create: {
        id: s.id,
        userId: user.id,
        familyId: family.id,
        displayName: s.displayName,
        schoolGrade: s.schoolGrade,
        targetAheadMonths: 6,
        dailyGoalMinutes: 30,
        xp: 0,
        streakDays: 0,
      },
    });

    await prisma.studentSettings.upsert({
      where: { studentId: profile.id },
      update: { onboardingCompleted: true },
      create: { studentId: profile.id, onboardingCompleted: true },
    });

    for (const subject of [mathSubject, englishSubject]) {
      await prisma.studentSubject.upsert({
        where: {
          studentId_subjectId: { studentId: profile.id, subjectId: subject.id },
        },
        update: {},
        create: {
          studentId: profile.id,
          subjectId: subject.id,
          enabled: true,
        },
      });

      const startLevel = await prisma.level.findFirst({
        where: {
          subjectId: subject.id,
          nominalGradeLevel: s.schoolGrade,
        },
        include: { skills: { orderBy: { sequence: "asc" }, take: 1 } },
      });

      if (startLevel?.skills[0]) {
        await prisma.studentSubjectPlacement.upsert({
          where: {
            studentId_subjectId: {
              studentId: profile.id,
              subjectId: subject.id,
            },
          },
          update: {
            currentLevelId: startLevel.id,
            currentSkillId: startLevel.skills[0].id,
            assessedGradeLevel: s.schoolGrade,
          },
          create: {
            studentId: profile.id,
            subjectId: subject.id,
            schoolGrade: s.schoolGrade,
            assessedGradeLevel: s.schoolGrade,
            currentLevelId: startLevel.id,
            currentSkillId: startLevel.skills[0].id,
            monthsAheadOrBehind: 0,
            confidenceScore: 0.5,
          },
        });

        await prisma.masteryState.upsert({
          where: {
            studentId_skillId: {
              studentId: profile.id,
              skillId: startLevel.skills[0].id,
            },
          },
          update: {},
          create: {
            studentId: profile.id,
            skillId: startLevel.skills[0].id,
            status: "LEARNING",
          },
        });
      }
    }
  }

  console.log("Seed complete!");
  console.log("");
  console.log("Demo accounts (password: demo1234):");
  console.log(`  Admin:   ${admin.email}`);
  console.log(`  Parent:  ${parent.email}`);
  console.log(`  Student A (4th grade): ${students[0].email}`);
  console.log(`  Student B (6th grade): ${students[1].email}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
