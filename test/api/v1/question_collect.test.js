var app = require('../../../app');
var request = require('supertest')(app);
var should = require('should');
var support = require('../../support/support');

describe('test/api/v1/question_collect.test.js', function () {

  var mockUser, mockQuestion;

  before(function (done) {
    support.createUser(function (err, user) {
      mockUser = user;
      support.createQuestion(user.id, function (err, question) {
        mockQuestion = question;
        done();
      });
    });
  });

  // 主题被收藏之前
  describe('before collect question', function () {

    describe('get /question_collect/:loginname', function () {

      it('should list question with length = 0', function (done) {
        request.get('/api/v1/question_collect/' + mockUser.loginname)
          .end(function (err, res) {
            should.not.exists(err);
            res.body.success.should.true();
            res.body.data.length.should.equal(0);
            done();
          });
      });

    });

    describe('get /api/v1/question/:questionid', function () {

      it('should return question info with is_collect = false', function (done) {
        request.get('/api/v1/question/' + mockQuestion.id)
          .query({
            accesstoken: mockUser.accessToken
          })
          .end(function (err, res) {
            should.not.exists(err);
            res.body.success.should.true();
            res.body.data.is_collect.should.false();
            done();
          });
      });

    });

  });

  // 收藏主题
  describe('post /question_collect/collect', function () {

    it('should 401 with no accessToken', function (done) {
      request.post('/api/v1/question_collect/collect')
        .send({
          question_id: mockQuestion.id
        })
        .end(function (err, res) {
          should.not.exists(err);
          res.status.should.equal(401);
          res.body.success.should.false();
          done();
        });
    });

    it('should collect question with correct accessToken', function (done) {
      request.post('/api/v1/question_collect/collect')
        .send({
          accesstoken: mockUser.accessToken,
          question_id: mockQuestion.id
        })
        .end(function (err, res) {
          should.not.exists(err);
          res.body.success.should.true();
          done();
        });
    });

    it('should not collect question twice', function (done) {
      request.post('/api/v1/question_collect/collect')
        .send({
          accesstoken: mockUser.accessToken,
          question_id: mockQuestion.id
        })
        .end(function (err, res) {
          should.not.exists(err);
          res.body.success.should.false();
          done();
        });
    });

    it('should fail when question_id is not valid', function (done) {
      request.post('/api/v1/question_collect/collect')
        .send({
          accesstoken: mockUser.accessToken,
          question_id: mockQuestion.id + "not_valid"
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
      request.post('/api/v1/question_collect/collect')
        .send({
          accesstoken: mockUser.accessToken,
          question_id: notFoundQuestionId
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

  });

  // 主题被收藏之后
  describe('after collect question', function () {

    describe('get /question_collect/:loginname', function () {

      it('should list question with length = 1', function (done) {
        request.get('/api/v1/question_collect/' + mockUser.loginname)
          .end(function (err, res) {
            should.not.exists(err);
            res.body.success.should.true();
            res.body.data.length.should.equal(1);
            res.body.data[0].id.should.equal(mockQuestion.id);
            done();
          });
      });

      it('should fail when user not found', function (done) {
        request.get('/api/v1/question_collect/' + mockUser.loginname + 'not_found')
          .end(function (err, res) {
            should.not.exists(err);
            res.status.should.equal(404);
            res.body.success.should.false();
            done();
          });
      });

    });

    describe('get /api/v1/question/:questionid', function () {

      it('should return question info with is_collect = true', function (done) {
        request.get('/api/v1/question/' + mockQuestion.id)
          .query({
            accesstoken: mockUser.accessToken
          })
          .end(function (err, res) {
            should.not.exists(err);
            res.body.success.should.true();
            res.body.data.is_collect.should.true();
            done();
          });
      });

    });

  });

  // 取消收藏主题
  describe('post /question_collect/de_collect', function () {

    it('should 401 with no accessToken', function (done) {
      request.post('/api/v1/question_collect/de_collect')
        .send({
          question_id: mockQuestion.id
        })
        .end(function (err, res) {
          should.not.exists(err);
          res.status.should.equal(401);
          res.body.success.should.false();
          done();
        });
    });

    it('should decollect question with correct accessToken', function (done) {
      request.post('/api/v1/question_collect/de_collect')
        .send({
          accesstoken: mockUser.accessToken,
          question_id: mockQuestion.id
        })
        .end(function (err, res) {
          should.not.exists(err);
          res.body.success.should.true();
          done();
        });
    });

    it('should not decollect question twice', function (done) {
      request.post('/api/v1/question_collect/de_collect')
        .send({
          accesstoken: mockUser.accessToken,
          question_id: mockQuestion.id
        })
        .end(function (err, res) {
          should.not.exists(err);
          res.body.success.should.false();
          done();
        });
    });

    it('should fail when question_id is not valid', function (done) {
      request.post('/api/v1/question_collect/de_collect')
        .send({
          accesstoken: mockUser.accessToken,
          question_id: mockQuestion.id + "not_valid"
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
      request.post('/api/v1/question_collect/de_collect')
        .send({
          accesstoken: mockUser.accessToken,
          question_id: notFoundQuestionId
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

  });

  // 主题被取消收藏之后
  describe('after decollect question', function () {

    describe('get /question_collect/:loginname', function () {

      it('should list question with length = 0', function (done) {
        request.get('/api/v1/question_collect/' + mockUser.loginname)
          .end(function (err, res) {
            should.not.exists(err);
            res.body.success.should.true();
            res.body.data.length.should.equal(0);
            done();
          });
      });

    });

    describe('get /api/v1/question/:questionid', function () {

      it('should return question info with is_collect = false', function (done) {
        request.get('/api/v1/question/' + mockQuestion.id)
          .query({
            accesstoken: mockUser.accessToken
          })
          .end(function (err, res) {
            should.not.exists(err);
            res.body.success.should.true();
            res.body.data.is_collect.should.false();
            done();
          });
      });

    });

  });

});
