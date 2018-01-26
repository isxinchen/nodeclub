var eventproxy = require('eventproxy');
var QuestionProxy   = require('../../proxy').Question;
var QuestionCollectProxy = require('../../proxy').QuestionCollect;
var UserProxy = require('../../proxy').User;
var _ = require('lodash');
var validator    = require('validator');

function list(req, res, next) {
  var loginname = req.params.loginname;
  var ep        = new eventproxy();

  ep.fail(next);

  UserProxy.getUserByLoginName(loginname, ep.done(function (user) {
    if (!user) {
      res.status(404);
      return res.send({success: false, error_msg: '用户不存在'});
    }

    // api 返回 100 条就好了
    QuestionCollectProxy.getQuestionCollectsByUserId(user._id, {limit: 100}, ep.done('collected_questions'));

    ep.all('collected_questions', function (collected_questions) {

      var ids = collected_questions.map(function (doc) {
        return String(doc.question_id)
      });
      var query = { _id: { '$in': ids } };
      QuestionProxy.getQuestionsByQuery(query, {}, ep.done('questions', function (questions) {
        questions = _.sortBy(questions, function (question) {
          return ids.indexOf(String(question._id))
        });
        return questions
      }));

    });

    ep.all('questions', function (questions) {
      questions = questions.map(function (question) {
        question.author = _.pick(question.author, ['loginname', 'avatar_url']);
        return _.pick(question, ['id', 'author_id', 'tab', 'content', 'title', 'last_answer_at',
          'good', 'top', 'answer_count', 'visit_count', 'create_at', 'author']);
      });
      res.send({success: true, data: questions})

    })
  }))
}

exports.list = list;

function collect(req, res, next) {
  var question_id = req.body.question_id;

  if (!validator.isMongoId(question_id)) {
    res.status(400);
    return res.send({success: false, error_msg: '不是有效的话题id'});
  }

  QuestionProxy.getQuestion(question_id, function (err, question) {
    if (err) {
      return next(err);
    }
    if (!question) {
      res.status(404);
      return res.json({success: false, error_msg: '话题不存在'});
    }

    QuestionCollectProxy.getQuestionCollect(req.user.id, question._id, function (err, doc) {
      if (err) {
        return next(err);
      }
      if (doc) {
        res.json({success: false});
        return;
      }

      QuestionCollectProxy.newAndSave(req.user.id, question._id, function (err) {
        if (err) {
          return next(err);
        }
        res.json({success: true});
      });
      UserProxy.getUserById(req.user.id, function (err, user) {
        if (err) {
          return next(err);
        }
        user.collect_question_count += 1;
        user.save();
      });

      question.collect_count += 1;
      question.save();
    });
  });
}

exports.collect = collect;

function de_collect(req, res, next) {
  var question_id = req.body.question_id;

  if (!validator.isMongoId(question_id)) {
    res.status(400);
    return res.send({success: false, error_msg: '不是有效的话题id'});
  }

  QuestionProxy.getQuestion(question_id, function (err, question) {
    if (err) {
      return next(err);
    }
    if (!question) {
      res.status(404);
      return res.json({success: false, error_msg: '话题不存在'});
    }
    QuestionCollectProxy.remove(req.user.id, question._id, function (err, removeResult) {
      if (err) {
        return next(err);
      }
      if (removeResult.result.n == 0) {
        return res.json({success: false})
      }

      UserProxy.getUserById(req.user.id, function (err, user) {
        if (err) {
          return next(err);
        }
        user.collect_question_count -= 1;
        user.save();
      });

      question.collect_count -= 1;
      question.save();

      res.json({success: true});
    });

  });
}

exports.de_collect = de_collect;
