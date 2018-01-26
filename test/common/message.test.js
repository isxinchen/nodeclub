var should = require('should');
var app = require('../../app');
var request = require('supertest')(app);
var mm = require('mm');
var support = require('../support/support');
var _ = require('lodash');
var pedding = require('pedding');
var multiline = require('multiline');
var MessageService = require('../../common/message');
var eventproxy = require('eventproxy');
var AnswerProxy = require('../../proxy').Answer;

describe('test/common/message.test.js', function () {
  var atUser;
  var author;
  var question;
  var answer;
  before(function (done) {
    var ep = new eventproxy();

    ep.all('question', function (_question) {
      question = _question;
      done();
    });
    support.ready(function () {
      atUser = support.normalUser;
      author = atUser;
      answer = {};
      support.createQuestion(author._id, ep.done('question'));
    });
  });

  afterEach(function () {
    mm.restore();
  });

  describe('#sendAnswerMessage', function () {
    it('should send answer message', function (done) {
      mm(AnswerProxy, 'getAnswerById', function (id, callback) {
        callback(null, {author: {}});
      });
      MessageService.sendAnswerMessage(atUser._id, author._id, question._id, answer._id,
        function (err, msg) {
          request.get('/my/messages')
          .set('Cookie', support.normalUserCookie)
          .expect(200, function (err, res) {
            var texts = [
              author.loginname,
              '回复了你的话题',
              question.title,
            ];
            texts.forEach(function (text) {
              res.text.should.containEql(text)
            })
            done(err);
          });
        });
    });
  });

  describe('#sendAtMessage', function () {
    it('should send at message', function (done) {
      mm(AnswerProxy, 'getAnswerById', function (id, callback) {
        callback(null, {author: {}});
      });
      MessageService.sendAtMessage(atUser._id, author._id, question._id, answer._id,
        function (err, msg) {
          request.get('/my/messages')
          .set('Cookie', support.normalUserCookie)
          .expect(200, function (err, res) {
            var texts = [
              author.loginname,
              '在话题',
              question.title,
              '中@了你',
            ];
            texts.forEach(function (text) {
              res.text.should.containEql(text)
            })
            done(err);
          });
        });
    });
  });
})
