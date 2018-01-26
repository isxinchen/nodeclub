var app = require('../../app');
var request = require('supertest')(app);
var support = require('../support/support');
var AnswerProxy = require('../../proxy/answer');

describe('test/controllers/answer.test.js', function () {
  before(function (done) {
    support.ready(done);
  });

  var answer1Id;

  describe('answer1', function () {
    it('should add a answer1', function (done) {
      var question = support.testQuestion;
      request.post('/' + question._id + '/answer')
      .set('Cookie', support.normalUserCookie)
      .send({
        r_content: 'test answer 1'
      })
      .expect(302)
      .end(function (err, res) {
        res.headers['location'].should.match(new RegExp('/question/' + question.id + '#\\w+'));

        // 记录下这个 answer1 的 id
        answer1Id = res.headers['location'].match(/#(\w+)/)[1];

        done(err);
      });
    });

    it('should 422 when add a empty answer1', function (done) {
      var question = support.testQuestion;
      request.post('/' + question._id + '/answer')
      .set('Cookie', support.normalUserCookie)
      .send({
        r_content: ''
      })
      .expect(422)
      .end(done);
    });

    it('should not add a answer1 when not login', function (done) {
      request.post('/' + support.testQuestion._id + '/answer')
      .send({
        r_content: 'test answer 1'
      })
      .expect(403)
      .end(done);
    });
  });

  describe('edit answer', function () {
    it('should not show edit page when not author', function (done) {
      request.get('/answer/' + answer1Id + '/edit')
      .set('Cookie', support.normalUser2Cookie)
      .expect(403)
      .end(done);
    });

    it('should show edit page when is author', function (done) {
      request.get('/answer/' + answer1Id + '/edit')
      .set('Cookie', support.normalUserCookie)
      .expect(200)
      .end(function (err, res) {
        res.text.should.containEql('test answer 1');
        done(err);
      });
    });

    it('should update edit', function (done) {
      var question = support.testQuestion;
      request.post('/answer/' + answer1Id + '/edit')
      .send({
        t_content: 'been update',
      })
      .set('Cookie', support.normalUserCookie)
      .end(function (err, res) {
        res.status.should.equal(302);
        res.headers['location'].should.match(new RegExp('/question/' + question.id + '#\\w+'));
        done(err);
      });
    });
  });

  describe('upvote answer', function () {
    var answer1, answer1UpCount;
    before(function (done) {
      AnswerProxy.getAnswer(answer1Id, function (err, answer) {
        answer1 = answer;
        answer1UpCount = answer1.ups.length;
        done(err);
      });
    });

    it('should increase', function (done) {
      request.post('/answer/' + answer1Id + '/up')
      .send({answerId: answer1Id})
      .set('Cookie', support.normalUser2Cookie)
      .end(function (err, res) {
        res.status.should.equal(200);
        res.body.should.eql({
          success: true,
          action: 'up',
        });
        done(err);
      });
    });

    it('should decrease', function (done) {
      request.post('/answer/' + answer1Id + '/up')
      .send({answerId: answer1Id})
      .set('Cookie', support.normalUser2Cookie)
      .end(function (err, res) {
        res.status.should.equal(200);
        res.body.should.eql({
          success: true,
          action: 'down',
        });
        done(err);
      });
    });

  });

  describe('delete answer', function () {
    it('should should not delete when not author', function (done) {
      request.post('/answer/' + answer1Id + '/delete')
      .send({
        answer_id: answer1Id
      })
      .expect(403)
      .end(done);
    });

    it('should delete answer when author', function (done) {
      request.post('/answer/' + answer1Id + '/delete')
      .send({
        answer_id: answer1Id
      })
      .set('Cookie', support.normalUserCookie)
      .expect(200)
      .end(function (err, res) {
        res.body.should.eql({status: 'success'});
        done(err);
      });
    });
  });
});

