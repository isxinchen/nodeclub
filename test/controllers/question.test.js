
var should = require('should');
var app = require('../../app');
var request = require('supertest')(app);
var support = require('../support/support');
var mm = require('mm');
var store = require('../../common/store');
var pedding = require('pedding');

describe('test/controllers/question.test.js', function () {

  before(function (done) {
    support.ready(done);
  });

  afterEach(function () {
    mm.restore();
  });

  describe('#index', function () {
    it('should get /question/:tid 200', function (done) {
      request.get('/question/' + support.testQuestion._id)
      .expect(200, function (err, res) {
        res.text.should.containEql('test question content');
        res.text.should.containEql('alsotang');
        done(err);
      });
    });

    it('should get /question/:tid 200 when login in', function (done) {
      request.get('/question/' + support.testQuestion._id)
      .set('Cookie', support.normalUser2Cookie)
      .expect(200, function (err, res) {
        res.text.should.containEql('test question content');
        res.text.should.containEql('alsotang');
        done(err);
      });
    });
  });

  describe('#create', function () {
    it('should show a create page', function (done) {
      request.get('/question/create')
        .set('Cookie', support.normalUserCookie)
        .expect(200, function (err, res) {
          res.text.should.containEql('发布话题');
          done(err);
        });
    });
  });

  describe('#put', function () {
    it('should not create a question when no title', function (done) {
      request.post('/question/create')
      .send({
        title: '',
        tab: 'share',
        t_content: '木耳敲回车',
      })
      .set('Cookie', support.normalUserCookie)
      .expect(422, function (err, res) {
        res.text.should.containEql('标题不能是空的。');
        done(err);
      });
    });

    it('should not create a question when no tab', function (done) {
      request.post('/question/create')
      .send({
        title: '呵呵复呵呵',
        tab: '',
        t_content: '木耳敲回车',
      })
      .set('Cookie', support.normalUserCookie)
      .expect(422, function (err, res) {
        res.text.should.containEql('必须选择一个版块。');
        done(err);
      });
    });

    it('should not create a question when no content', function (done) {
      request.post('/question/create')
      .send({
        title: '呵呵复呵呵',
        tab: 'share',
        t_content: '',
      })
      .set('Cookie', support.normalUserCookie)
      .expect(422, function (err, res) {
        res.text.should.containEql('内容不可为空');
        done(err);
      });
    });

    it('should create a question', function (done) {
      request.post('/question/create')
      .send({
        title: '呵呵复呵呵' + new Date(),
        tab: 'share',
        t_content: '木耳敲回车',
      })
      .set('Cookie', support.normalUserCookie)
      .expect(302, function (err, res) {
        res.headers.location.should.match(/^\/question\/\w+$/);
        done(err);
      });
    });
  });

  describe('#showEdit', function () {
    it('should show a edit page', function (done) {
      request.get('/question/' + support.testQuestion._id + '/edit')
      .set('Cookie', support.normalUserCookie)
      .expect(200, function (err, res) {
        res.text.should.containEql('编辑话题');
        done(err);
      });
    });
  });

  describe('#update', function () {
    it('should update a question', function (done) {
      request.post('/question/' + support.testQuestion._id + '/edit')
      .send({
        title: '修改后的 question title',
        tab: 'share',
        t_content: '修改后的木耳敲回车',
      })
      .set('Cookie', support.normalUserCookie)
      .expect(302, function (err, res) {
        res.headers.location.should.match(/^\/question\/\w+$/);
        done(err);
      });
    });
  });

  describe('#delete', function () {
    var wouldBeDeleteQuestion;
    before(function (done) {
      support.createQuestion(support.normalUser._id, function (err, question) {
        wouldBeDeleteQuestion = question;
        done(err);
      });
    });

    it('should not delete a question when not author', function (done) {
      request.post('/question/' + wouldBeDeleteQuestion._id + '/delete')
      .set('Cookie', support.normalUser2Cookie)
      .expect(403, function (err, res) {
        res.body.should.eql({success: false, message: '无权限'});
        done(err);
      });
    });

    it('should delele a question', function (done) {
      request.post('/question/' + wouldBeDeleteQuestion._id + '/delete')
      .set('Cookie', support.normalUserCookie)
      .expect(200, function (err, res) {
        res.body.should.eql({ success: true, message: '话题已被删除。' });
        done(err);
      });
    });
  });

  describe('#top', function () {
    it('should top a question', function (done) {
      request.post('/question/' + support.testQuestion._id + '/top')
      .set('Cookie', support.adminUserCookie)
      .expect(200, function (err, res) {
        res.text.should.containEql('此话题已置顶。');
        done(err);
      });
    });

    it('should untop a question', function (done) {
      request.post('/question/' + support.testQuestion._id + '/top')
      .set('Cookie', support.adminUserCookie)
      .expect(200, function (err, res) {
        res.text.should.containEql('此话题已取消置顶');
        done(err);
      });
    });
  });

  describe('#good', function () {
    it('should good a question', function (done) {
      request.post('/question/' + support.testQuestion._id + '/good')
      .set('Cookie', support.adminUserCookie)
      .expect(200, function (err, res) {
        res.text.should.containEql('此话题已加精。');
        done(err);
      });
    });

    it('should ungood a question', function (done) {
      request.post('/question/' + support.testQuestion._id + '/good')
      .set('Cookie', support.adminUserCookie)
      .expect(200, function (err, res) {
        res.text.should.containEql('此话题已取消加精。');
        done(err);
      });
    });
  });

  describe('#collect', function () {
    it('should collect a question', function (done) {
      request.post('/question/collect')
      .send({
        question_id: support.testQuestion._id,
      })
      .set('Cookie', support.normalUser2Cookie)
      .expect(200, function (err, res) {
        res.body.should.eql({status: 'success'});
        done(err);
      })
    })

    it('should not collect a question twice', function (done) {
      request.post('/question/collect')
      .send({
        question_id: support.testQuestion._id,
      })
      .set('Cookie', support.normalUser2Cookie)
      .expect(200, function (err, res) {
        res.body.should.eql({status: 'failed'});
        done(err);
      })
    })
  })

  describe('#de_collect', function () {
    it('should decollect a question', function (done) {
      request.post('/question/de_collect')
      .send({
        question_id: support.testQuestion._id,
      })
      .set('Cookie', support.normalUser2Cookie)
      .expect(200, function (err, res) {
        res.body.should.eql({status: 'success'});
        done(err);
      });
    });

    it('should not decollect a non-exist question_collect', function (done) {
      request.post('/question/de_collect')
      .send({
        question_id: support.testQuestion._id,
      })
      .set('Cookie', support.normalUser2Cookie)
      .expect(200, function (err, res) {
        res.body.should.eql({status: 'failed'});
        done(err);
      });
    });
  });

  describe('#upload', function () {
    it('should upload a file', function (done) {

      mm(store, 'upload', function (file, options, callback) {
        callback(null, {
          url: 'upload_success_url'
        });
      });
      request.post('/upload')
      .attach('selffile', __filename)
      .set('Cookie', support.normalUser2Cookie)
      .end(function (err, res) {
        res.body.should.eql({"success": true, "url": "upload_success_url"});
        done(err);
      });
    });
  });

  describe('#lock', function () {
    it('should lock a question', function (done) {
      request.post('/question/' + support.testQuestion._id + '/lock')
      .set('Cookie', support.adminUserCookie)
      .expect(200, function (err, res) {
        res.text.should.containEql('此话题已锁定。');
        done(err);
      });
    });

    it('should not answer a locked question', function (done) {
      var question = support.testQuestion;
      request.post('/' + question._id + '/answer')
      .set('Cookie', support.normalUserCookie)
      .send({
        r_content: 'test answer 1'
      })
      .expect(403)
      .end(function (err, res) {
        res.text.should.equal('此主题已锁定。');
        done(err);
      });
    });

    it('should unlock a question', function (done) {
      request.post('/question/' + support.testQuestion._id + '/lock')
      .set('Cookie', support.adminUserCookie)
      .expect(200, function (err, res) {
        res.text.should.containEql('此话题已取消锁定。');
        done(err);
      });
    });

    it('should answer a unlocked question', function (done) {
      var question = support.testQuestion;
      request.post('/' + question._id + '/answer')
      .set('Cookie', support.normalUserCookie)
      .send({
        r_content: 'test answer 1'
      })
      .expect(302)
      .end(function (err, res) {
        done(err);
      });
    });
  });
});
