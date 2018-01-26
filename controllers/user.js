var User         = require('../proxy').User;
var Question        = require('../proxy').Question;
var Answer        = require('../proxy').Answer;
var QuestionCollect = require('../proxy').QuestionCollect;
var utility      = require('utility');
var util         = require('util');
var QuestionModel   = require('../models').Question;
var AnswerModel   = require('../models').Answer;
var tools        = require('../common/tools');
var config       = require('../config');
var EventProxy   = require('eventproxy');
var validator    = require('validator');
var _            = require('lodash');

exports.index = function (req, res, next) {
  var user_name = req.params.name;
  User.getUserByLoginName(user_name, function (err, user) {
    if (err) {
      return next(err);
    }
    if (!user) {
      res.render404('这个用户不存在。');
      return;
    }

    var render = function (recent_questions, recent_answers) {
      user.url = (function () {
        if (user.url && user.url.indexOf('http') !== 0) {
          return 'http://' + user.url;
        }
        return user.url;
      })();
      // 如果用户没有激活，那么管理员可以帮忙激活
      var token = '';
      if (!user.active && req.session.user && req.session.user.is_admin) {
        token = utility.md5(user.email + user.pass + config.session_secret);
      }
      res.render('user/index', {
        user: user,
        recent_questions: recent_questions,
        recent_answers: recent_answers,
        token: token,
        pageTitle: util.format('@%s 的个人主页', user.loginname),
      });
    };

    var proxy = new EventProxy();
    proxy.assign('recent_questions', 'recent_answers', render);
    proxy.fail(next);

    var query = {author_id: user._id};
    var opt = {limit: 5, sort: '-create_at'};
    Question.getQuestionsByQuery(query, opt, proxy.done('recent_questions'));

    Answer.getRepliesByAuthorId(user._id, {limit: 20, sort: '-create_at'},
      proxy.done(function (answers) {

        var question_ids = answers.map(function (answer) {
          return answer.question_id.toString()
        })
        question_ids = _.uniq(question_ids).slice(0, 5); //  只显示最近5条

        var query = {_id: {'$in': question_ids}};
        var opt = {};
        Question.getQuestionsByQuery(query, opt, proxy.done('recent_answers', function (recent_answers) {
          recent_answers = _.sortBy(recent_answers, function (question) {
            return question_ids.indexOf(question._id.toString())
          })
          return recent_answers;
        }));
      }));
  });
};

exports.listStars = function (req, res, next) {
  User.getUsersByQuery({is_star: true}, {}, function (err, stars) {
    if (err) {
      return next(err);
    }
    res.render('user/stars', {stars: stars});
  });
};

exports.showSetting = function (req, res, next) {
  User.getUserById(req.session.user._id, function (err, user) {
    if (err) {
      return next(err);
    }
    if (req.query.save === 'success') {
      user.success = '保存成功。';
    }
    user.error = null;
    return res.render('user/setting', user);
  });
};

exports.setting = function (req, res, next) {
  var ep = new EventProxy();
  ep.fail(next);

  // 显示出错或成功信息
  function showMessage(msg, data, isSuccess) {
    data = data || req.body;
    var data2 = {
      loginname: data.loginname,
      email: data.email,
      url: data.url,
      location: data.location,
      signature: data.signature,
      weibo: data.weibo,
      accessToken: data.accessToken,
    };
    if (isSuccess) {
      data2.success = msg;
    } else {
      data2.error = msg;
    }
    res.render('user/setting', data2);
  }

  // post
  var action = req.body.action;
  if (action === 'change_setting') {
    var url = validator.trim(req.body.url);
    var location = validator.trim(req.body.location);
    var weibo = validator.trim(req.body.weibo);
    var signature = validator.trim(req.body.signature);

    User.getUserById(req.session.user._id, ep.done(function (user) {
      user.url = url;
      user.location = location;
      user.signature = signature;
      user.weibo = weibo;
      user.save(function (err) {
        if (err) {
          return next(err);
        }
        req.session.user = user.toObject({virtual: true});
        return res.redirect('/setting?save=success');
      });
    }));
  }
  if (action === 'change_password') {
    var old_pass = validator.trim(req.body.old_pass);
    var new_pass = validator.trim(req.body.new_pass);
    if (!old_pass || !new_pass) {
      return res.send('旧密码或新密码不得为空');
    }

    User.getUserById(req.session.user._id, ep.done(function (user) {
      tools.bcompare(old_pass, user.pass, ep.done(function (bool) {
        if (!bool) {
          return showMessage('当前密码不正确。', user);
        }

        tools.bhash(new_pass, ep.done(function (passhash) {
          user.pass = passhash;
          user.save(function (err) {
            if (err) {
              return next(err);
            }
            return showMessage('密码已被修改。', user, true);

          });
        }));
      }));
    }));
  }
};

exports.toggleStar = function (req, res, next) {
  var user_id = req.body.user_id;
  User.getUserById(user_id, function (err, user) {
    if (err) {
      return next(err);
    }
    if (!user) {
      return next(new Error('user is not exists'));
    }
    user.is_star = !user.is_star;
    user.save(function (err) {
      if (err) {
        return next(err);
      }
      res.json({ status: 'success' });
    });
  });
};

exports.listCollectedQuestions = function (req, res, next) {
  var name = req.params.name;
  var page = Number(req.query.page) || 1;
  var limit = config.list_question_count;

  User.getUserByLoginName(name, function (err, user) {
    if (err || !user) {
      return next(err);
    }
    var pages = Math.ceil(user.collect_question_count/limit);
    var render = function (questions) {
      res.render('user/collect_questions', {
        questions: questions,
        current_page: page,
        pages: pages,
        user: user
      });
    };

    var proxy = EventProxy.create('questions', render);
    proxy.fail(next);

    var opt = {
      skip: (page - 1) * limit,
      limit: limit,
    };

    QuestionCollect.getQuestionCollectsByUserId(user._id, opt, proxy.done(function (docs) {
      var ids = docs.map(function (doc) {
        return String(doc.question_id)
      })
      var query = { _id: { '$in': ids } };

      Question.getQuestionsByQuery(query, {}, proxy.done('questions', function (questions) {
        questions = _.sortBy(questions, function (question) {
          return ids.indexOf(String(question._id))
        })
        return questions
      }));
    }));
  });
};

exports.top100 = function (req, res, next) {
  var opt = {limit: 100, sort: '-score'};
  User.getUsersByQuery({is_block: false}, opt, function (err, tops) {
    if (err) {
      return next(err);
    }
    res.render('user/top100', {
      users: tops,
      pageTitle: 'top100',
    });
  });
};

exports.listQuestions = function (req, res, next) {
  var user_name = req.params.name;
  var page = Number(req.query.page) || 1;
  var limit = config.list_question_count;

  User.getUserByLoginName(user_name, function (err, user) {
    if (!user) {
      res.render404('这个用户不存在。');
      return;
    }

    var render = function (questions, pages) {
      res.render('user/questions', {
        user: user,
        questions: questions,
        current_page: page,
        pages: pages
      });
    };

    var proxy = new EventProxy();
    proxy.assign('questions', 'pages', render);
    proxy.fail(next);

    var query = {'author_id': user._id};
    var opt = {skip: (page - 1) * limit, limit: limit, sort: '-create_at'};
    Question.getQuestionsByQuery(query, opt, proxy.done('questions'));

    Question.getCountByQuery(query, proxy.done(function (all_questions_count) {
      var pages = Math.ceil(all_questions_count / limit);
      proxy.emit('pages', pages);
    }));
  });
};

exports.listReplies = function (req, res, next) {
  var user_name = req.params.name;
  var page = Number(req.query.page) || 1;
  var limit = 50;

  User.getUserByLoginName(user_name, function (err, user) {
    if (!user) {
      res.render404('这个用户不存在。');
      return;
    }

    var render = function (questions, pages) {
      res.render('user/answers', {
        user: user,
        questions: questions,
        current_page: page,
        pages: pages
      });
    };

    var proxy = new EventProxy();
    proxy.assign('questions', 'pages', render);
    proxy.fail(next);

    var opt = {skip: (page - 1) * limit, limit: limit, sort: '-create_at'};
    Answer.getRepliesByAuthorId(user._id, opt, proxy.done(function (answers) {
      // 获取所有有评论的主题
      var question_ids = answers.map(function (answer) {
        return answer.question_id.toString();
      });
      question_ids = _.uniq(question_ids);

      var query = {'_id': {'$in': question_ids}};
      Question.getQuestionsByQuery(query, {}, proxy.done('questions', function (questions) {
        questions = _.sortBy(questions, function (question) {
          return question_ids.indexOf(question._id.toString())
        })
        return questions;
      }));
    }));

    Answer.getCountByAuthorId(user._id, proxy.done('pages', function (count) {
      var pages = Math.ceil(count / limit);
      return pages;
    }));
  });
};

exports.block = function (req, res, next) {
  var loginname = req.params.name;
  var action = req.body.action;

  var ep = EventProxy.create();
  ep.fail(next);

  User.getUserByLoginName(loginname, ep.done(function (user) {
    if (!user) {
      return next(new Error('user is not exists'));
    }
    if (action === 'set_block') {
      ep.all('block_user',
        function (user) {
          res.json({status: 'success'});
        });
      user.is_block = true;
      user.save(ep.done('block_user'));

    } else if (action === 'cancel_block') {
      user.is_block = false;
      user.save(ep.done(function () {

        res.json({status: 'success'});
      }));
    }
  }));
};

exports.deleteAll = function (req, res, next) {
  var loginname = req.params.name;

  var ep = EventProxy.create();
  ep.fail(next);

  User.getUserByLoginName(loginname, ep.done(function (user) {
    if (!user) {
      return next(new Error('user is not exists'));
    }
    ep.all('del_questions', 'del_answers', 'del_ups',
      function () {
        res.json({status: 'success'});
      });
    // 删除主题
    QuestionModel.update({author_id: user._id}, {$set: {deleted: true}}, {multi: true}, ep.done('del_questions'));
    // 删除评论
    AnswerModel.update({author_id: user._id}, {$set: {deleted: true}}, {multi: true}, ep.done('del_answers'));
    // 点赞数也全部干掉
    AnswerModel.update({}, {$pull: {'ups': user._id}}, {multi: true}, ep.done('del_ups'));
  }));
};
