// 一次性脚本
// 修复之前重复编辑帖子会导致重复 @someone 的渲染问题
var QuestionModel = require('../models').Question;

QuestionModel.find({content: /\[{2,}@/}).exec(function (err, questions) {
  questions.forEach(function (question) {
    question.content = fix(question.content);
    console.log(question.id);
    question.save();
  });
});

function fix(str) {
  str = str.replace(/\[{1,}(\[@\w+)(\]\(.+?\))\2+/, function (match_text, $1, $2) {
    return $1 + $2;
  });
  return str;
}
