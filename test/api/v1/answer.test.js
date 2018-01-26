var app = require('../../../app');
var request = require('supertest')(app);
var pedding = require('pedding');
var support =  require('../../support/support');
var should  = require('should');

describe('test/api/v1/answer.test.js', function () {
  
  var mockQuestion, mockAnswerId;
  
  before(function (done) {
    support.ready(function () {
      support.createQuestion(support.normalUser.id, function (err, question) {
        mockQuestion = question;
        done();
      });
    });
  });

  describe('create answer', function () {

    it('should success', function (done) {
      request.post('/api/v1/question/' + mockQuestion.id + '/answers')
        .send({
          content: 'answer a question from api',
          accesstoken: support.normalUser.accessToken
        })
        .end(function (err, res) {
          should.not.exists(err);
          res.body.success.should.true();
          mockAnswerId = res.body.answer_id;
          done();
        });
    });

    it('should success with repli_id', function (done) {
      request.post('/api/v1/question/' + mockQuestion.id + '/answers')
        .send({
          content: 'answer a question from api',
          accesstoken: support.normalUser.accessToken,
          repli_id: mockAnswerId
        })
        .end(function (err, res) {
          should.not.exists(err);
          res.body.success.should.true();
          done();
        });
    });

    it('should 401 when no accessToken', function (done) {
      request.post('/api/v1/question/' + mockQuestion.id + 'not_valid' + '/answers')
        .send({
          content: 'answer a question from api'
        })
        .end(function (err, res) {
          should.not.exists(err);
          res.status.should.equal(401);
          res.body.success.should.false();
          done();
        });
    });

    it('should fail when question_id is not valid', function (done) {
      request.post('/api/v1/question/' + mockQuestion.id + 'not_valid' + '/answers')
        .send({
          content: 'answer a question from api',
          accesstoken: support.normalUser.accessToken
        })
        .end(function (err, res) {
          should.not.exists(err);
          res.status.should.equal(400);
          res.body.success.should.false();
          done();
        });
    });

    it('should fail when no content', function (done) {
      request.post('/api/v1/question/' + mockQuestion.id + '/answers')
        .send({
          content: '',
          accesstoken: support.normalUser.accessToken
        })
        .end(function (err, res) {
          should.not.exists(err);
          res.status.should.equal(400);
          res.body.success.should.false();
          done();
        });
    });

    it('should fail when question not found', function (done) {
      var notFoundQuestionId = mockQuestion.id.split("").reverse().join("");
      request.post('/api/v1/question/' + notFoundQuestionId + '/answers')
        .send({
          content: 'answer a question from api',
          accesstoken: support.normalUser.accessToken
        })
        .end(function (err, res) {
          should.not.exists(err);
          if (mockQuestion.id === notFoundQuestionId) { // 小概率事件id反转之后还不变
            res.body.success.should.true();
          } else {
            res.status.should.equal(404);
            res.body.success.should.false();
          }
          done();
        });
    });

    it('should fail when question is locked', function (done) {
      // 锁住 question
      mockQuestion.lock = !mockQuestion.lock;
      mockQuestion.save(function () {
        request.post('/api/v1/question/' + mockQuestion.id + '/answers')
          .send({
            content: 'answer a question from api',
            accesstoken: support.normalUser.accessToken
          })
          .end(function (err, res) {
            should.not.exists(err);
            res.status.should.equal(403);
            res.body.success.should.false();
            // 解锁 question
            mockQuestion.lock = !mockQuestion.lock;
            mockQuestion.save(function () {
              done();
            });
          });
      });
    });

  });
  
  describe('create ups', function () {

    it('should up', function (done) {
      request.post('/api/v1/answer/' + mockAnswerId + '/ups')
        .send({
          accesstoken: support.normalUser.accessToken
        })
        .end(function (err, res) {
          should.not.exists(err);
          res.body.success.should.true();
          res.body.action.should.equal("up");
          done();
        });
    });

    it('should down', function (done) {
      request.post('/api/v1/answer/' + mockAnswerId + '/ups')
        .send({
          accesstoken: support.normalUser.accessToken
        })
        .end(function (err, res) {
          should.not.exists(err);
          res.body.success.should.true();
          res.body.action.should.equal("down");
          done();
        });
    });

    it('should 401 when no accessToken', function (done) {
      request.post('/api/v1/answer/' + mockAnswerId + '/ups')
        .end(function (err, res) {
          should.not.exists(err);
          res.status.should.equal(401);
          res.body.success.should.false();
          done();
        });
    });

    it('should fail when answer_id is not valid', function (done) {
      request.post('/api/v1/answer/' + mockAnswerId + 'not_valid' + '/ups')
        .send({
          accesstoken: support.normalUser.accessToken
        })
        .end(function (err, res) {
          should.not.exists(err);
          res.status.should.equal(400);
          res.body.success.should.false();
          done();
        });
    });

    it('should fail when answer_id is not found', function (done) {
      var notFoundAnswerId = mockAnswerId.split("").reverse().join("");
      request.post('/api/v1/answer/' + notFoundAnswerId + '/ups')
        .send({
          accesstoken: support.normalUser.accessToken
        })
        .end(function (err, res) {
          should.not.exists(err);
          if (mockAnswerId === notFoundAnswerId) { // 小概率事件id反转之后还不变
            res.body.success.should.true();
          } else {
            res.status.should.equal(404);
            res.body.success.should.false();
          }
          done();
        });
    });

  });
  
});
