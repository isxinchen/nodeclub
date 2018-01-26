var QuestionCollect = require('../models').QuestionCollect;
var UserModel = require('../models').User;
var QuestionModel = require('../models').Question

// 修复用户的question_collect计数
QuestionCollect.aggregate(
  [{
    "$group" :
      {
        _id : {user_id: "$user_id"},
        count : { $sum : 1}
      }
  }], function (err, result) {
    result.forEach(function (row) {
      var userId = row._id.user_id;
      var count = row.count;

      UserModel.findOne({
        _id: userId
      }, function (err, user) {

        if (!user) {
          return;
        }

        user.collect_question_count = count;
        user.save(function () {
          console.log(user.loginname, count)
        });
      })
    })
  })

  // 修复帖子的question_collect计数
  QuestionCollect.aggregate(
    [{
      "$group" :
        {
          _id : {question_id: "$question_id"},
          count : { $sum : 1}
        }
    }], function (err, result) {
      result.forEach(function (row) {
        var question_id = row._id.question_id;
        var count = row.count;

        QuestionModel.findOne({
          _id: question_id
        }, function (err, question) {

          if (!question) {
            return;
          }

          question.collect_question_count = count;
          question.save(function () {
            console.log(question.id, count)
          });
        })
      })
    })
