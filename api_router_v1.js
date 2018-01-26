var express           = require('express');
var questionController   = require('./api/v1/question');
var questionCollectController   = require('./api/v1/question_collect');
var userController    = require('./api/v1/user');
var toolsController   = require('./api/v1/tools');
var answerController   = require('./api/v1/answer');
var messageController = require('./api/v1/message');
var middleware        = require('./api/v1/middleware');
var limit             = require('./middlewares/limit');
var config            = require('./config');

var router            = express.Router();


// 主题
router.get('/questions', questionController.index);
router.get('/question/:id', middleware.tryAuth, questionController.show);
router.post('/questions', middleware.auth, limit.peruserperday('create_question', config.create_post_per_day, {showJson: true}), questionController.create);
router.post('/questions/update', middleware.auth, questionController.update);


// 主题收藏
router.post('/question_collect/collect', middleware.auth, questionCollectController.collect); // 关注某话题
router.post('/question_collect/de_collect', middleware.auth, questionCollectController.de_collect); // 取消关注某话题
router.get('/question_collect/:loginname', questionCollectController.list);

// 用户
router.get('/user/:loginname', userController.show);



// accessToken 测试
router.post('/accesstoken', middleware.auth, toolsController.accesstoken);

// 评论
router.post('/question/:question_id/answers', middleware.auth, limit.peruserperday('create_answer', config.create_answer_per_day, {showJson: true}), answerController.create);
router.post('/answer/:answer_id/ups', middleware.auth, answerController.ups);

// 通知
router.get('/messages', middleware.auth, messageController.index);
router.get('/message/count', middleware.auth, messageController.count);
router.post('/message/mark_all', middleware.auth, messageController.markAll);
router.post('/message/mark_one/:msg_id', middleware.auth, messageController.markOne);

module.exports = router;
