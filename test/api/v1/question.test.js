var app = require('../../../app');
var request = require('supertest')(app);
var should = require('should');
var support = require('../../support/support');

describe('test/api/v1/question.test.js', function () {
  
  var mockUser, mockQuestion;

  var createdQuestionId = null;

  before(function (done) {
    support.createUser(function (err, user) {
      mockUser = user;
      support.createQuestion(user.id, function (err, question) {
        mockQuestion = question;
        support.createAnswer(question.id, user.id, function (err, answer) {
          support.createSingleUp(answer.id, user.id, function (err, answer) {
            done();
          });
        });
      });
    });
  });

  describe('get /api/v1/questions', function () {

    it('should return questions', function (done) {
      request.get('/api/v1/questions')
        .end(function (err, res) {
          should.not.exists(err);
          res.body.success.should.true();
          res.body.data.length.should.above(0);
          done();
        });
    });

    it('should return questions with limit 2', function (done) {
      request.get('/api/v1/questions')
        .query({
          limit: 2
        })
        .end(function (err, res) {
          should.not.exists(err);
          res.body.success.should.true();
          res.body.data.length.should.equal(2);
          done();
        });
    });

  });

  describe('get /api/v1/question/:questionid', function () {

    it('should return question info', function (done) {
      request.get('/api/v1/question/' + mockQuestion.id)
        .end(function (err, res) {
          should.not.exists(err);
          res.body.success.should.true();
          res.body.data.id.should.equal(mockQuestion.id);
          done();
        });
    });

    it('should fail when question_id is not valid', function (done) {
      request.get('/api/v1/question/' + mockQuestion.id + 'not_valid')
        .end(function (err, res) {
          should.not.exists(err);
          res.status.should.equal(400);
          res.body.success.should.false();
          done();
        });
    });

    it('should fail when question not found', function (done) {
      var notFoundQuestionId = mockQuestion.id.split("").reverse().join("");
      request.get('/api/v1/question/' + notFoundQuestionId)
        .end(function (err, res) {
          should.not.exists(err);
          if (mockQuestion.id === notFoundQuestionId) { // 小概率事件id反转之后还不变
            res.body.success.should.true();
            res.body.data.id.should.equal(mockQuestion.id);
          } else {
            res.status.should.equal(404);
            res.body.success.should.false();
          }
          done();
        });
    });

    it('should is_uped to be false without accesstoken', function (done) {
      request.get('/api/v1/question/' + mockQuestion.id)
        .end(function (err, res) {
          should.not.exists(err);
          res.body.data.answers[0].is_uped.should.false();
          done();
        });
    });

    it('should is_uped to be false with wrong accesstoken', function (done) {
      request.get('/api/v1/question/' + mockQuestion.id)
        .query({
          accesstoken: support.normalUser2.accesstoken
        })
        .end(function (err, res) {
          should.not.exists(err);
          res.body.data.answers[0].is_uped.should.false();
          done();
        });
    });

    it('should is_uped to be true with right accesstoken', function (done) {
      request.get('/api/v1/question/' + mockQuestion.id)
        .query({
          accesstoken: mockUser.accessToken
        })
        .end(function (err, res) {
          should.not.exists(err);
          res.body.data.answers[0].is_uped.should.true();
          done();
        });
    });

  });

  describe('post /api/v1/questions', function () {

    it('should create a question', function (done) {
      request.post('/api/v1/questions')
        .send({
          accesstoken: mockUser.accessToken,
          title: '我是API测试标题',
          tab: 'share',
          content: '我是API测试内容'
        })
        .end(function (err, res) {
          should.not.exists(err);
          res.body.success.should.true();
          res.body.question_id.should.be.String();
          createdQuestionId = res.body.question_id
          done();
        });
    });

    it('should 401 with no accessToken', function (done) {
      request.post('/api/v1/questions')
        .send({
          title: '我是API测试标题',
          tab: 'share',
          content: '我是API测试内容'
        })
        .end(function (err, res) {
          should.not.exists(err);
          res.status.should.equal(401);
          res.body.success.should.false();
          done();
        });
    });

    it('should fail with no title', function (done) {
      request.post('/api/v1/questions')
        .send({
          accesstoken: mockUser.accessToken,
          title: '',
          tab: 'share',
          content: '我是API测试内容'
        })
        .end(function (err, res) {
          should.not.exists(err);
          res.status.should.equal(400);
          res.body.success.should.false();
          done();
        });
    });

    it('should fail with error tab', function (done) {
      request.post('/api/v1/questions')
        .send({
          accesstoken: mockUser.accessToken,
          title: '我是API测试标题',
          tab: '',
          content: '我是API测试内容'
        })
        .end(function (err, res) {
          should.not.exists(err);
          res.status.should.equal(400);
          res.body.success.should.false();
          done();
        });
    });

    it('should fail with no content', function (done) {
      request.post('/api/v1/questions')
        .send({
          accesstoken: mockUser.accessToken,
          title: '我是API测试标题',
          tab: 'share',
          content: ''
        })
        .end(function (err, res) {
          should.not.exists(err);
          res.status.should.equal(400);
          res.body.success.should.false();
          done();
        });
    });

  });

  describe('post /api/v1/questions/update', function () {
    it('should update a question', function (done) {
      request.post('/api/v1/questions/update')
        .send({
          accesstoken: mockUser.accessToken,
          question_id: createdQuestionId,
          title: '我是API测试标题',
          tab: 'share',
          content: '我是API测试内容 /api/v1/questions/update'
        })
        .end(function (err, res) {
          should.not.exists(err);
          res.body.success.should.true();
          res.body.question_id.should.eql(createdQuestionId);
          done();
        });
    })
  })
  
});
