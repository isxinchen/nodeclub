var _            = require('lodash');
var eventproxy   = require('eventproxy');
var UserProxy    = require('../../proxy').User;
var QuestionProxy   = require('../../proxy').Question;
var AnswerProxy   = require('../../proxy').Answer;
var QuestionCollect = require('../../proxy').QuestionCollect;

var show = function (req, res, next) {
  var loginname = req.params.loginname;
  var ep        = new eventproxy();

  ep.fail(next);

  UserProxy.getUserByLoginName(loginname, ep.done(function (user) {
    if (!user) {
      res.status(404);
      return res.send({success: false, error_msg: '用户不存在'});
    }
    var query = {author_id: user._id};
    var opt = {limit: 15, sort: '-create_at'};
    QuestionProxy.getQuestionsByQuery(query, opt, ep.done('recent_questions'));

    AnswerProxy.getRepliesByAuthorId(user._id, {limit: 20, sort: '-create_at'},
      ep.done(function (answers) {
        var question_ids = answers.map(function (answer) {
          return answer.question_id.toString()
        });
        question_ids = _.uniq(question_ids).slice(0, 5); //  只显示最近5条

        var query = {_id: {'$in': question_ids}};
        var opt = {};
        QuestionProxy.getQuestionsByQuery(query, opt, ep.done('recent_answers', function (recent_answers) {
          recent_answers = _.sortBy(recent_answers, function (question) {
            return question_ids.indexOf(question._id.toString())
          });
          return recent_answers;
        }));
      }));

    ep.all('recent_questions', 'recent_answers',
      function (recent_questions, recent_answers) {

        user = _.pick(user, ['loginname', 'avatar_url', 'githubUsername',
          'create_at', 'score']);

        user.recent_questions = recent_questions.map(function (question) {
          question.author = _.pick(question.author, ['loginname', 'avatar_url']);
          question        = _.pick(question, ['id', 'author', 'title', 'last_answer_at']);
          return question;
        });
        user.recent_answers = recent_answers.map(function (question) {
          question.author = _.pick(question.author, ['loginname', 'avatar_url']);
          question        = _.pick(question, ['id', 'author', 'title', 'last_answer_at']);
          return question;
        });

        res.send({success: true, data: user});
      });
  }));
};

exports.show = show;
