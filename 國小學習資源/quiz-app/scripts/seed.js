'use strict';
// 匯入六個科目、每科 1000 題（可重複執行，已存在的題目會略過）
const { pool, tx } = require('../src/db');
const { SUBJECTS, buildSubject } = require('../src/questions');

(async () => {
  for (const subject of SUBJECTS) {
    const questions = buildSubject(subject);
    const inserted = await tx(async (c) => {
      const { rows } = await c.query(
        `INSERT INTO subjects (code, name, sort_order) VALUES ($1, $2, $3)
         ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name, sort_order = EXCLUDED.sort_order
         RETURNING id`,
        [subject.code, subject.name, subject.sortOrder]
      );
      const subjectId = rows[0].id;
      let count = 0;
      for (let i = 0; i < questions.length; i += 250) {
        const batch = questions.slice(i, i + 250);
        const res = await c.query(
          `INSERT INTO questions (subject_id, qkey, grade, topic, stem, choices, answer, explanation)
           SELECT $1, x.qkey, x.grade, x.topic, x.stem, x.choices, x.answer, x.explanation
           FROM jsonb_to_recordset($2::jsonb)
             AS x(qkey text, grade smallint, topic text, stem text, choices jsonb, answer smallint, explanation text)
           ON CONFLICT (qkey) DO NOTHING`,
          [subjectId, JSON.stringify(batch)]
        );
        count += res.rowCount;
      }
      return count;
    });
    console.log(`${subject.name}：產生 ${questions.length} 題，新增 ${inserted} 題`);
  }
  await pool.end();
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
