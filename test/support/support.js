var User = require('../../proxy/user');
var Question = require('../../proxy/question');
var Answer = require('../../proxy/answer');
var ready = require('ready');
var eventproxy = require('eventproxy');
var utility = require('utility');
var tools = require('../../common/tools');

function randomInt() {
  return (Math.random() * 10000).toFixed(0);
}

var createUser = exports.createUser = function (callback) {
  var key = new Date().getTime() + '_' + randomInt();
  tools.bhash('pass', function (err, passhash) {
    User.newAndSave('alsotang' + key, 'alsotang' + key, passhash, 'alsotang' + key + '@gmail.com', '', false, callback);
  });
};

exports.createUserByNameAndPwd = function (loginname, pwd, callback) {
  tools.bhash(pwd, function (err, passhash) {
    User.newAndSave(loginname, loginname, passhash, loginname + +new Date() + '@gmail.com', '', true, callback);
  });
};

var createQuestion = exports.createQuestion = function (authorId, callback) {
  var key = new Date().getTime() + '_' + randomInt();
  Question.newAndSave('question title' + key, 'test question content' + key, 'share', authorId, callback);
};

var createAnswer = exports.createAnswer = function (questionId, authorId, callback) {
  Answer.newAndSave('I am content', questionId, authorId, callback);
};

var createSingleUp = exports.createSingleUp = function (answerId, userId, callback) {
  Answer.getAnswer(answerId, function (err, answer) {
    answer.ups = [];
    answer.ups.push(userId);
    answer.save(function (err, answer) {
      callback(err, answer);
    });
  });
};

function mockUser(user) {
  return 'mock_user=' + JSON.stringify(user) + ';';
}

ready(exports);

var ep = new eventproxy();
ep.fail(function (err) {
  console.error(err);
});

ep.all('user', 'user2', 'admin', function (user, user2, admin) {
  exports.normalUser = user;
  exports.normalUserCookie = mockUser(user);

  exports.normalUser2 = user2;
  exports.normalUser2Cookie = mockUser(user2);

  var adminObj = JSON.parse(JSON.stringify(admin));
  adminObj.is_admin = true;
  exports.adminUser = admin;
  exports.adminUserCookie = mockUser(adminObj);

  createQuestion(user._id, ep.done('question'));
});
createUser(ep.done('user'));
createUser(ep.done('user2'));
createUser(ep.done('admin'));

ep.all('question', function (question) {
  exports.testQuestion = question;
  createAnswer(question._id, exports.normalUser._id, ep.done('answer'));
});

ep.all('answer', function (answer) {
  exports.testAnswer = answer;
  exports.ready(true);
});



