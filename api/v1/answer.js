var eventproxy = require('eventproxy');
var validator  = require('validator');
var Question      = require('../../proxy').Question;
var User       = require('../../proxy').User;
var Answer      = require('../../proxy').Answer;
var at         = require('../../common/at');
var message    = require('../../common/message');
var config     = require('../../config');

var create = function (req, res, next) {
  var question_id = req.params.question_id;
  var content  = req.body.content || '';
  var answer_id = req.body.answer_id;

  var ep = new eventproxy();
  ep.fail(next);

  var str = validator.trim(content);
  if (str === '') {
    res.status(400);
    return res.send({success: false, error_msg: '回复内容不能为空'});
  }

  if (!validator.isMongoId(question_id)) {
    res.status(400);
    return res.send({success: false, error_msg: '不是有效的话题id'});
  }
  
  Question.getQuestion(question_id, ep.done(function (question) {
    if (!question) {
      res.status(404);
      return res.send({success: false, error_msg: '话题不存在'});
    }
    if (question.lock) {
      res.status(403);
      return res.send({success: false, error_msg: '该话题已被锁定'});
    }
    ep.emit('question', question);
  }));

  ep.all('question', function (question) {
    User.getUserById(question.author_id, ep.done('question_author'));
  });

  ep.all('question', 'question_author', function (question, questionAuthor) {
    Answer.newAndSave(content, question_id, req.user.id, answer_id, ep.done(function (answer) {
      Question.updateLastAnswer(question_id, answer._id, ep.done(function () {
        ep.emit('answer_saved', answer);
        //发送at消息，并防止重复 at 作者
        var newContent = content.replace('@' + questionAuthor.loginname + ' ', '');
        at.sendMessageToMentionUsers(newContent, question_id, req.user.id, answer._id);
      }));
    }));

    User.getUserById(req.user.id, ep.done(function (user) {
      user.score += 5;
      user.answer_count += 1;
      user.save();
      ep.emit('score_saved');
    }));
  });

  ep.all('answer_saved', 'question', function (answer, question) {
    if (question.author_id.toString() !== req.user.id.toString()) {
      message.sendAnswerMessage(question.author_id, req.user.id, question._id, answer._id);
    }
    ep.emit('message_saved');
  });

  ep.all('answer_saved', 'message_saved', 'score_saved', function (answer) {
    res.send({
      success: true,
      answer_id: answer._id
    });
  });
};

exports.create = create;

var ups = function (req, res, next) {
  var answerId = req.params.answer_id;
  var userId  = req.user.id;

  if (!validator.isMongoId(answerId)) {
    res.status(400);
    return res.send({success: false, error_msg: '不是有效的评论id'});
  }
  
  Answer.getAnswerById(answerId, function (err, answer) {
    if (err) {
      return next(err);
    }
    if (!answer) {
      res.status(404);
      return res.send({success: false, error_msg: '评论不存在'});
    }
    if (answer.author_id.equals(userId) && !config.debug) {
      res.status(403);
      return res.send({success: false, error_msg: '不能帮自己点赞'});
    } else {
      var action;
      answer.ups = answer.ups || [];
      var upIndex = answer.ups.indexOf(userId);
      if (upIndex === -1) {
        answer.ups.push(userId);
        action = 'up';
      } else {
        answer.ups.splice(upIndex, 1);
        action = 'down';
      }
      answer.save(function () {
        res.send({
          success: true,
          action: action
        });
      });
    }
  });
};

exports.ups = ups;
