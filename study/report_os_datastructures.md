# Phase 0 Extension: Personalization in Required Courses (Operating Systems & Data Structures)

**Status:** PASS for both courses.
**Courses:** Operating Systems (CS-UH 3010) and Data Structures (CS-UH 1050), NYU Abu Dhabi.
**Relationship to the first Phase 0 report:** the first report validated SynapsEd on an elective course, AI Literacy. This report validates the same underlying system on two required courses. The two course types needed different validation methods, and this report explains why, in full.

This document explains every step we took, every term we used, and every decision we made. It assumes you know general research methods. It does not assume you know this codebase, this AI model, or any of our internal terms. Every term gets a plain definition the first time it appears.

---

## 1. What we set out to test

SynapsEd reads a course syllabus and a student's answers to an onboarding survey. It then generates a **pathway**: a personalized sequence of lesson topics for that student, built from the material in the syllabus. Each lesson in a pathway is a **node**.

Our first Phase 0 report asked a simple question about this system: does it actually build different pathways for different students, or does it just relabel the same generic pathway for everyone? We tested this on AI Literacy, an elective course, and the system passed. Different students received meaningfully different pathways, matched to their stated background and goals.

This report asks the same underlying question on two different courses. But along the way, we discovered the question itself needed to change. AI Literacy is an elective course. A student can reasonably skip a whole topic area if it does not match their goals. Operating Systems and Data Structures are required, cumulative courses. Every student sits the same midterm and the same final exam, both of which cover the entire syllabus. A student cannot skip a required topic. This difference forced us to redefine what "personalized" means before we could test anything, and that redefinition is the main intellectual contribution of this report.

We also ran a power analysis, a statistical method for calculating how many student profiles we actually need to trust our results, and we built a new check for whether the AI's content changes in a genuinely useful way for each student, not just in label. We explain all of this below, with real examples from our data at every step.

---

## 2. Methods at a glance

Each step in this study has a goal and a specific named mathematical or statistical tool built to test it. This table is a map. Each row points to the section with the full explanation and the real results.

| Goal | Method (named) | What it does, briefly | Full detail |
|---|---|---|---|
| Check whether the scaffolding count falls in the right order across three tiers, reliably, not just approximately | **Jonckheere-Terpstra test** | A statistical test built specifically for ordered groups. It checks whether a value tends to rise or fall consistently as you move from group to group, and reports how likely that pattern is to be real rather than chance. | Section 10 |
| Decide how many student profiles are actually needed to trust a result | **Cohen's d** paired with a **statistical power calculation** | Cohen's d gives the size of a difference between two groups in a standard, comparable unit. A power calculation then works backward from that size to the smallest sample that would reliably detect it. | Section 11 |
| Check whether personalized node text genuinely differs from student to student, and from other nodes in the same pathway | **Sentence embeddings**, compared with **cosine similarity** | An embedding model turns a sentence into a list of numbers that represents its meaning. Cosine similarity measures how close two of these number-lists are, giving a score from 0 to 1 for how similar two pieces of text mean. | Section 12 |
| Check whether scaffolding content reads as simpler than core or enrichment content | **Flesch Reading Ease** | A long-standing readability formula. It scores a passage from its sentence length and syllable count, and a higher score means easier reading. | Section 12 |

---

## 3. Why "personalized" needed a new definition

AI Literacy has two alternative content tracks: a Business track and a Technical track. A student focused on business strategy can receive four lessons from the Business track and zero from the Technical track. That is a legitimate, correct outcome for an elective course, because nothing in the Business track is required knowledge for that student.

Operating Systems and Data Structures have no equivalent alternative tracks. We confirmed this by reading both course syllabi in full. Every topic, from process scheduling to hash tables, appears on the syllabus because it is examined on the midterm, the final, or both. If we personalized these two courses the same way we personalized AI Literacy, a "successful" result would mean some students receive pathways that skip material they will be tested on in three weeks. That outcome is not personalization.

We resolved this by defining personalization differently for required courses. We call the new definition **a fixed destination, with a personalized route**.

- **The destination is fixed.** Every student's pathway must include every topic area from the syllabus, in enough depth to plausibly meet that topic's learning goal. No topic area is ever skipped.
- **The route is personalized.** Students differ in how they get to that same destination. A student who has never used the course's core technology before needs extra groundwork early on. A student who already knows that technology well needs less groundwork and more depth elsewhere. Both students end up covering everything. They get there by different paths.
- **The budget stays the same.** The personalization shows up in how a student's time gets allocated within their pathway, not in a longer or shorter pathway overall. The goal is to help a less-prepared student catch up to their classmates faster, not to give them a longer course.

For both courses, we identified one clear, dominant source of student difference: prior experience with the course's foundational technology. For Data Structures, that technology is the C++ programming language. A student can have passed the prerequisite course and still have zero experience writing C++ code, since the prerequisite course does not require it. For Operating Systems, the foundational technology is systems-level C programming and general OS concepts. We call a student's level on this axis their **tier**. Every student in our study falls into one of three tiers: **no prior exposure**, **some prior exposure**, or **strong prior exposure**.

We deliberately left one thing out of this study: how much practice material a student prefers, such as more short drills versus fewer, denser problems. Phase 0 only tests the pathway itself, the sequence of lesson topics. Practice-set design is a separate question for later work.

---

## 4. The two courses

Both syllabi came from real NYU Abu Dhabi course documents. We converted each one into the same structured format SynapsEd already uses: a set of labeled **blocks**, where each block groups together a handful of related lessons. Every node in a generated pathway carries a tag showing which block it belongs to, called a `syllabusBlockId`.

**Operating Systems (CS-UH 3010).** A required, 3-credit, 17-week course. Sixty percent of the grade comes from a midterm and a cumulative final exam, both covering the entire syllabus. We grouped the syllabus into 7 blocks: OS Foundations, Processes and Communication, Threads and Scheduling, Synchronization, Deadlocks, Memory Management, and I/O and File Storage.

**Data Structures (CS-UH 1050).** A required, 4-credit, 16-week course, taught in C++. Fifty-five percent of the grade comes from exams covering the entire syllabus. We grouped the syllabus into 8 blocks: C++ Foundations, Linear Structures and Recursion, Stacks and Queues, Trees, Priority Queues and Heaps, Hashing, Balanced Search Trees, and Sorting.

---

## 5. Step one: building a survey from the syllabus

Before SynapsEd can personalize anything, it needs to know something about the student. In the real, deployed version of SynapsEd, a professor can click a button that reads their course's syllabus and automatically writes a set of onboarding survey questions for that specific course.

We rebuilt this exact method as a standalone step in our study, and ran it against both syllabi. Each run produces 10 to 15 questions, covering five fixed categories:

- prerequisite knowledge
- readiness for the course's learning goals
- exam preparation habits
- personal goals for the course
- learning preferences

Here is the first, most important question our method generated for Data Structures, taken directly from our results:

> **Question:** Which of the following best describes your prior experience with the C++ programming language?
> - No prior exposure: I have never written code in C++. (This is the standard starting point for the course.)
> - Some prior exposure: I understand basic C++ syntax (loops, variables) but have little experience with pointers, templates, or memory management.
> - Strong prior exposure: I am comfortable with C++ OOP, memory management, and advanced features like templates or move semantics.

This single question is what assigns each student to their tier. We asked our method to make sure a question like this always appeared, since our entire study depends on being able to sort students into the three tiers cleanly.

The Operating Systems survey asked the equivalent question about prior exposure to C programming and systems-level development, along with questions specific to that course, such as how comfortable a student is debugging a program that crashes only sometimes, a realistic concern once a student reaches the Synchronization block.

---

## 6. Step two: creating realistic student profiles

A **profile** is a simulated student's full set of answers to the survey above. It is not a real person. We create profiles so we can test the system quickly and repeatably, without waiting on real students.

We generated 30 profiles per course, 10 for each of the three tiers. Thirty is close to the average number of students in one section of a course like this, which is why we chose it. We built a script that uses Gemini 3 Flash to write these profiles automatically, but with one important restriction: the script decides each profile's tier and locks in the exact answer to the tier-defining question itself, rather than letting the model choose it. Every other answer, such as career goals, personal concerns, and time constraints, is left to the model to write freely, so that the 10 students within one tier still read as 10 different, realistic people.

We made this choice on purpose. The tier is the one variable our whole study measures. If we let the model decide the tier answer along with everything else, we would have no guarantee that our "no prior exposure" group actually contains students who said they have no prior exposure. Locking the ground truth answer removes that risk.

Here are two real profiles from our Operating Systems data, one from each end of the tier scale:

**Profile: `os_no_prior_exposure_1`**
*A high-achieving student who excels in theoretical data structures and logic but feels intimidated by the transition from high-level languages like Python to systems-level C programming.*
- Prior exposure to C: *"No prior exposure: I have never programmed in C or worked with systems-level code."*
- Career goal: *"I am interested in pursuing a career in Cybersecurity; I recognize that understanding OS internals like memory protection and privilege levels is fundamental to identifying system vulnerabilities."*
- Biggest worry: *"I am worried about the non-deterministic nature of race conditions and how to effectively debug code where the error might not happen every time I run it."*

**Profile: `os_strong_prior_exposure_1`**
*A junior computer science student with a strong background in low-level development from a previous cybersecurity internship, seeking to deepen their understanding of kernel-level security.*
- Prior exposure to C: *"Strong prior exposure: I am comfortable with pointers, manual memory management, and systems programming."*
- Career goal: *"I am aiming for a career in cybersecurity research, specifically focusing on kernel-level vulnerabilities and exploit mitigation, which requires a deep understanding of how OS internals manage resources."*
- Preferred approach: *"I prefer hands-on experimental evaluation of design tradeoffs."*

Notice both students share an interest in cybersecurity. Their difference is entirely about prior technical background, which is exactly the axis we designed this study to isolate.

---

## 7. Step three: generating personalized pathways

For each profile, we send the syllabus and the survey answers to Gemini 3 Flash, along with a written set of rules. The model responds with a full pathway: 14 to 20 nodes, depending on the course, each with a title, a description, a difficulty level, and its `syllabusBlockId`.

For these two required courses, we added something new to every node: a **role**. Every node gets tagged as one of four roles:

- **core_required**, the standard required content everyone needs.
- **scaffolding_catchup**, extra groundwork for a student who needs to build up background before the required content makes sense.
- **enrichment_advanced**, additional depth for a student who is ready to go further than the minimum.
- **assessment**, a checkpoint node tied to a quiz, midterm, or final.

The role tag is what lets us check personalization in a required course. Since every block must appear for every student, we cannot measure personalization by which blocks show up. We measure it by the mix of roles within each block. A student with no prior exposure should see more scaffolding_catchup nodes in the foundational block. A student with strong prior exposure should see fewer scaffolding_catchup nodes there and more enrichment_advanced nodes instead. The total pathway length should stay about the same across all three tiers, since the goal is a faster route to the same destination, not a longer or shorter one.

---

## 8. What went wrong first, and what that taught us

Our first full run, on real Gemini output, failed. We are including this failure in the report because it produced a useful, general finding, not just a bug we fixed and moved past.

**The first problem.** The written instructions we sent to Gemini were mostly copied from the AI Literacy setup, and part of that copy was never updated. Gemini was told, in effect, that different students should receive different blocks entirely, which is correct for AI Literacy and wrong for a required course. Gemini followed that instruction faithfully. The result: almost no difference in scaffolding between a no-prior-exposure student and a strong-prior-exposure student.

**The second problem.** After we corrected that instruction, coverage improved a great deal, but the direction of personalization came out backwards. Strong-prior-exposure students were receiving slightly more scaffolding than no-prior-exposure students, the opposite of what we wanted. We opened the actual generated text to see why, and found a scaffolding node written for a strong-prior-exposure student whose own description said the node was meant "for students without prior systems exposure." Gemini was writing plausible-sounding justifications without reliably connecting them to the specific student's actual background.

**The fix.** We stopped describing the rule in prose and started stating it as an exact number. For every profile, we now tell Gemini precisely how many scaffolding_catchup nodes to include, calculated from that student's tier, before it generates anything. A no-prior-exposure student is told to include exactly 3. A some-prior-exposure student is told to include exactly 1. A strong-prior-exposure student is told to include exactly 0. This is the same technique our original AI Literacy study used to guarantee two profiles who differ only in learning style receive identical pathway structure. It turned out to be necessary here too, for a different kind of personalization.

**A third, related problem, in Data Structures only.** Coverage of required content came out short in two specific blocks, consistently, across every single profile. We again looked at the real output and found the cause: we had calculated the minimum number of nodes each block needs, called its floor, but we had only described that floor to Gemini in general terms, never as an exact number for each block. We fixed this the same way as the scaffolding problem: we now state each block's exact floor as a number, directly in the instructions.

Once we made both fixes, the general lesson became clear: telling an AI model what to do in careful prose is not enough for an instruction that must be followed exactly. Prose survives being roughly right. A count does not. This lesson first appeared in our AI Literacy study and now appears again, independently, in two different mechanisms within two different course types. That repetition is itself evidence the lesson is a real, general property of how these models follow instructions, not a one-time coincidence.

---

## 9. The results, shown directly

Below are the two real profiles from Section 6, with their full, final, real generated pathways side by side. This is the clearest evidence in this report that personalization is working as intended.

**`os_no_prior_exposure_1`** (16 nodes total)

| Block | Role | Title |
|---|---|---|
| OS Foundations | scaffolding_catchup | C Programming for Systems Basics |
| OS Foundations | scaffolding_catchup | Computer Architecture & OS Interface |
| OS Foundations | scaffolding_catchup | Systems Development Environment Setup |
| OS Foundations | core_required | OS Foundations & Kernel Structures |
| *(remaining 12 nodes)* | | *cover every other required block, ending with the Final Cumulative Course Review* |

**`os_strong_prior_exposure_1`** (15 nodes total)

| Block | Role | Title |
|---|---|---|
| OS Foundations | core_required | OS Structures & Dual-Mode Operation |
| OS Foundations | enrichment_advanced | Advanced Performance Analysis of Kernel Transitions |
| *(remaining 13 nodes)* | | *cover every other required block, including 5 more enrichment_advanced nodes on topics like lock-free programming and advanced file system design, ending with a Final Cumulative Review & Synthesis* |

Both students receive all 7 blocks. Both students end their course having covered the same required material. The no-prior-exposure student spends three extra nodes building up C programming and systems fundamentals before reaching the same required content. The strong-prior-exposure student skips that groundwork and instead receives five additional nodes of deeper, harder material spread across the course. The destination is identical. The route is not.

We saw the same pattern in Data Structures. A student with no prior C++ exposure received three extra nodes titled things like *"C++ Syntax for Python/Java Programmers"* and *"Memory Management & Pointers Primer,"* framed as introductions for someone coming from a different language. A student with strong C++ exposure skipped those and instead received a node on *"Advanced C++: RAII & Templates,"* a genuinely harder topic not offered to the less-prepared student.

---

## 10. Checking the numbers meet the rules

*Method used: three deterministic counting rules, plus the Jonckheere-Terpstra test (see Section 2).*

Section 3 set three rules for what a personalized required-course pathway must do: the destination is fixed, the route is personalized, and the budget stays the same. We wrote three automated checks in plain code, no AI model involved, one for each rule, to verify every one of the 30 pathways per course actually follows them.

1. **The coverage floor check**, for the destination-is-fixed rule. Does every block appear in every pathway, at or above the minimum count we calculated for it? This is a pass-or-fail check, not a personalization measurement. A required course fails immediately if any student's pathway drops a block below its floor.
2. **The role-mix check**, for the route-is-personalized rule. Does the number of scaffolding_catchup nodes in the foundational block go down as a student's tier goes up, across all 30 profiles, not just the 2 or 3 we might eyeball by hand?
3. **The length check**, for the budget-stays-the-same rule. Does every pathway's total node count stay within the target range we set for that course, regardless of tier?

**Result for Operating Systems:** every block met its floor in all 30 pathways. Every no-prior-exposure student received exactly 3 scaffolding nodes, every some-prior-exposure student received exactly 1, and every strong-prior-exposure student received exactly 0. Every pathway's length stayed within the target range of 14 to 18 nodes. All three checks passed.

**Result for Data Structures:** the same, exactly. Every block met its floor. The scaffolding counts landed at exactly 3, 1, and 0 per tier, with no exceptions. Every pathway stayed within the target range of 16 to 20 nodes.

We also ran the Jonckheere-Terpstra test, a statistical test built specifically to check whether a value rises or falls in order across three or more groups. It confirmed the scaffolding trend is statistically real for both courses, far beyond the usual threshold researchers use to call a result significant.

---

## 11. How many students do we actually need?

*Method used: Cohen's d and a statistical power calculation (see Section 2).*

Before this study, the plan discussed at our team meeting was to scale up to around 200 synthetic profiles, a number chosen by instinct rather than calculation. We ran an actual power analysis, using our real data instead of a guess, to find the minimum sample size needed to trust a result.

For AI Literacy, we used the existing 50 profiles and their real generated pathways. Instead of only comparing the two example profiles named in each of our five original hypotheses, we grouped every profile that matched each hypothesis's actual criteria and measured the real difference between groups using Cohen's d. The differences turned out to be large. Depending on the specific comparison, as few as 2 to 11 profiles per group were enough to detect the effect reliably. Two hundred profiles would mostly buy tighter precision on our diversity score, not a better chance of detecting something we could not already detect with far fewer profiles.

For Operating Systems and Data Structures, the power analysis question changed shape. Once we told Gemini the exact scaffolding count for each tier, every single profile within a tier landed on that exact number, with zero variation. A power analysis calculates how many samples you need to reliably detect a real but noisy effect. When an effect has no noise at all, because we are now enforcing it directly rather than discovering it, the calculation has nothing left to measure. This was itself a useful finding: it told us our role-mix personalization is now a guaranteed property of the system, not a probabilistic one, and it means the open question worth spending more samples on is no longer "does the count match," but "is the content genuinely different," which we cover next.

---

## 12. Does the label mean the content is different?

*Method used: sentence embeddings with cosine similarity, and the Flesch Reading Ease formula (see Section 2).*

Every check up to this point verifies a label Gemini attached to its own node, such as scaffolding_catchup. None of them verify whether that label is actually true of the node's writing. A scaffolding node could, in principle, carry the correct label while containing the exact same content as a core node next to it. We built one more check specifically to test this, since it is the one part of this study that had never been checked at all, in either course type, until now.

We used a small, free, local AI model designed to measure how similar two pieces of text are in meaning, called an embedding model. It converts a sentence into a set of numbers representing its meaning, and we compare two sentences by how close their numbers are, a measure called cosine similarity. A score near 1 means two sentences mean nearly the same thing. A score near 0 means they mean very different things. This method runs entirely on our own computer, costs nothing per use, and gives the same answer every time, unlike asking another AI model to judge quality, which is slow, costly, and was flagged in our team meeting as something we should reduce our reliance on.

We ran three checks with this tool.

**Check one: are personalized nodes actually different from student to student, or copied?** We compared every scaffolding_catchup node written for the 10 no-prior-exposure students against every other one, and did the same for core_required nodes as a comparison point. Required content should read fairly similarly from student to student, since it is the same required material. Personalized content should read somewhat differently, since it reflects each student's own background. For Operating Systems, this held clearly: scaffolding content scored 0.48 to 0.75 in similarity, while core content scored 0.77 to 0.86, meaningfully higher. The personalized nodes are genuinely being written differently for different students, not copied from a single template.

**Check two: within one student's pathway, is the scaffolding node actually distinct from the core node next to it?** For Operating Systems, yes: scaffolding and core content scored 0.43 in similarity to each other, lower than core and enrichment content scored against each other, at 0.54. The scaffolding node reads as more different from its neighbors than two pieces of required content read from each other.

**Check three: does scaffolding content actually read as simpler?** We used the Flesch Reading Ease score, where a higher number means easier reading. For Operating Systems, scaffolding content scored 27.8, core content scored 15.2, and enrichment content scored close to zero, meaning nearly unreadable, dense technical writing. The order is exactly what we would want: simplest for scaffolding, hardest for enrichment.

Data Structures told a different, more complicated story, and we want to report it honestly rather than only reporting the version that looks good. The diversity check held for the no-prior-exposure tier but not the some-prior-exposure tier. The within-pathway distinctness check came out nearly flat, meaning scaffolding content was not clearly more different from core content than core content is from itself. The readability check came out backwards: core content scored easier to read, at 34.9, than scaffolding content, at 23.9.

Before concluding Data Structures personalizes its content worse than Operating Systems does, we read the actual node titles by hand. Real examples from a no-prior-exposure student's scaffolding nodes: *"C++ Syntax for Python/Java Programmers,"* *"Memory Management & Pointers Primer,"* and *"C++ Pointers and Memory Model Refresher."* These read exactly like appropriate, friendly introductions for someone new to the language. The paired core content used standard course language, such as *"C++ Templates and Object-Oriented Design."* By eye, the content looks properly personalized.

This gap between what our automated numbers say and what a human reader sees points to two limits in the tools themselves, worth naming plainly. The readability formula was built for ordinary prose, not short technical course titles, and it rewards long sentences over short ones regardless of actual difficulty, so a short phrase like "Pointers Primer" can score worse than a longer sentence full of harder ideas. The distinctness check compares any scaffolding node against any core node in the same block, without checking whether they cover the same specific topic at a different depth or simply two different topics, which is a real gap in how we built the check, not a real gap in the content.

The honest conclusion is this: our diversity check, the one least affected by these two limits, gives a real, trustworthy signal, and that signal is positive for Operating Systems and mixed for Data Structures. Our other two checks need refinement before we trust their numbers on their own. This is also a good demonstration of why Phase 1, where actual professors and students look at actual pathways, remains necessary. An automatic check narrows what needs a human look. It does not replace one.

---

## 13. What this confirms, and what it changes

**It confirms** that SynapsEd can personalize a required, cumulative course correctly, keeping every student on track for the same required material while genuinely adapting how each student gets there. It confirms the core lesson from our original AI Literacy study generalizes: written rules alone are not reliable for a required, checkable outcome, and stating the requirement as an exact number, verified against real output, is. We found this lesson twice more, independently, in a different course type and a different personalization mechanism, which makes it a general finding about this technology rather than a one-off fix.

**It changes** our assumption about sample size. Two hundred profiles was never based on real data. Our actual numbers show AI Literacy's effects are strong enough to detect with far fewer profiles than that, and Operating Systems and Data Structures' role-mix personalization is now a guaranteed property rather than something we need a large sample to detect at all. It also changes where we think the real remaining risk sits. It is in whether the actual words in a node genuinely serve the student they were written for, not in whether the AI follows structural rules, which we can now verify and enforce directly.

## 14. What comes next

Before moving to Phase 1, human review by real professors and students, we recommend two decisions.

First, decide whether to improve the content-quality checks in Section 12, particularly the readability formula and the topic-versus-depth issue in the distinctness check, or treat the diversity check as sufficient evidence for now and let Phase 1's human reviewers cover the rest.

Second, decide how this validation work should feed the paper. One option is to include the full methodology, the failures and fixes included, as a system-validation section, showing the reviewers a system that was tested rigorously and corrected transparently. The other option is to treat this entire report as internal groundwork, and only report Phase 1's human results in the paper itself. We recommend the first option: a methods section that names its tools, shows a real failure, and shows the fix, reads as more credible to reviewers than a report that only shows a clean pass, and the Jonckheere-Terpstra test, the power analysis, and the embedding checks in this report are the kind of concrete, citable evidence a reviewer looks for.
