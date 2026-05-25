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
    update: {},
    create: {
      name: subjectName,
      slug: subjectSlug,
      description: `${subjectName} mastery curriculum for grades 3–7`,
    },
  });

  const track = await prisma.curriculumTrack.upsert({
    where: { id: `${subjectSlug}-track-3-7` },
    update: {},
    create: {
      id: `${subjectSlug}-track-3-7`,
      subjectId: subject.id,
      title: `${subjectName} Grades 3–7`,
      description: `Core ${subjectName.toLowerCase()} skills for elementary and middle school`,
      gradeBand: "GRADES_3_5",
      sequence: 1,
    },
  });

  const skillIdMap = new Map<string, string>(); // reserved for cross-level prerequisite wiring

  for (const levelDef of curriculum) {
    const level = await prisma.level.upsert({
      where: { id: `${subjectSlug}-level-${levelDef.grade}` },
      update: {},
      create: {
        id: `${subjectSlug}-level-${levelDef.grade}`,
        subjectId: subject.id,
        curriculumTrackId: track.id,
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
          difficulty: Math.min(levelDef.grade - 2, 5),
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
      if (levelDef.grade > 3 && si === 0) {
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

  const admin = await prisma.user.upsert({
    where: { email: "admin@tigerparent.local" },
    update: {},
    create: {
      email: "admin@tigerparent.local",
      name: "Admin User",
      password: passwordHash,
      role: "ADMIN",
    },
  });

  const parent = await prisma.user.upsert({
    where: { email: "parent@tigerparent.local" },
    update: {},
    create: {
      email: "parent@tigerparent.local",
      name: "Demo Parent",
      password: passwordHash,
      role: "PARENT",
      familyId: family.id,
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
      update: {},
      create: {
        email: s.email,
        name: s.name,
        password: passwordHash,
        role: "STUDENT",
        familyId: family.id,
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
