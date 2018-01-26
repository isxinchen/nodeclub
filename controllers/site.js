/*!
 * nodeclub - site index controller.
 * Copyright(c) 2012 fengmk2 <fengmk2@gmail.com>
 * Copyright(c) 2012 muyuan
 * MIT Licensed
 */

/**
 * Module dependencies.
 */

var User         = require('../proxy').User;
var Question        = require('../proxy').Question;
var config       = require('../config');
var eventproxy   = require('eventproxy');
var cache        = require('../common/cache');
var xmlbuilder   = require('xmlbuilder');
var renderHelper = require('../common/render_helper');
var _            = require('lodash');
var moment = require('moment');

exports.index = function (req, res, next) {
  var page = parseInt(req.query.page, 10) || 1;
  page = page > 0 ? page : 1;
  var tab = req.query.tab || 'all';

  var proxy = new eventproxy();
  proxy.fail(next);

  // 取主题
  var query = {};
  if (!tab || tab === 'all') {
    query.tab = {$nin: ['job', 'dev']}
  } else {
    if (tab === 'good') {
      query.good = true;
    } else {
      query.tab = tab;
    }
  }
  if (!query.good) {
    query.create_at = {$gte: moment().subtract(1, 'years').toDate()}
  }

  var limit = config.list_question_count;
  var options = { skip: (page - 1) * limit, limit: limit, sort: '-top -last_answer_at'};

  Question.getQuestionsByQuery(query, options, proxy.done('questions', function (questions) {
    return questions;
  }));

  // 取排行榜上的用户
  cache.get('tops', proxy.done(function (tops) {
    if (tops) {
      proxy.emit('tops', tops);
    } else {
      User.getUsersByQuery(
        {is_block: false},
        { limit: 10, sort: '-score'},
        proxy.done('tops', function (tops) {
          cache.set('tops', tops, 60 * 1);
          return tops;
        })
      );
    }
  }));
  // END 取排行榜上的用户

  // 取0回复的主题
  cache.get('no_answer_questions', proxy.done(function (no_answer_questions) {
    if (no_answer_questions) {
      proxy.emit('no_answer_questions', no_answer_questions);
    } else {
      Question.getQuestionsByQuery(
        { answer_count: 0, tab: {$nin: ['job', 'dev']}},
        { limit: 5, sort: '-create_at'},
        proxy.done('no_answer_questions', function (no_answer_questions) {
          cache.set('no_answer_questions', no_answer_questions, 60 * 1);
          return no_answer_questions;
        }));
    }
  }));
  // END 取0回复的主题

  // 取分页数据
  var pagesCacheKey = JSON.stringify(query) + 'pages';
  cache.get(pagesCacheKey, proxy.done(function (pages) {
    if (pages) {
      proxy.emit('pages', pages);
    } else {
      Question.getCountByQuery(query, proxy.done(function (all_questions_count) {
        var pages = Math.ceil(all_questions_count / limit);
        cache.set(pagesCacheKey, pages, 60 * 1);
        proxy.emit('pages', pages);
      }));
    }
  }));
  // END 取分页数据

  var tabName = renderHelper.tabName(tab);
  proxy.all('questions', 'tops', 'no_answer_questions', 'pages',
    function (questions, tops, no_answer_questions, pages) {
      res.render('index', {
        questions: questions,
        current_page: page,
        list_question_count: limit,
        tops: tops,
        no_answer_questions: no_answer_questions,
        pages: pages,
        tabs: config.tabs,
        tab: tab,
        pageTitle: tabName && (tabName + '版块'),
      });
    });
};

exports.sitemap = function (req, res, next) {
  var urlset = xmlbuilder.create('urlset',
    {version: '1.0', encoding: 'UTF-8'});
  urlset.att('xmlns', 'http://www.sitemaps.org/schemas/sitemap/0.9');

  var ep = new eventproxy();
  ep.fail(next);

  ep.all('sitemap', function (sitemap) {
    res.type('xml');
    res.send(sitemap);
  });

  cache.get('sitemap', ep.done(function (sitemapData) {
    if (sitemapData) {
      ep.emit('sitemap', sitemapData);
    } else {
      Question.getLimit5w(function (err, questions) {
        if (err) {
          return next(err);
        }
        questions.forEach(function (question) {
          urlset.ele('url').ele('loc', 'http://cnodejs.org/question/' + question._id);
        });

        var sitemapData = urlset.end();
        // 缓存一天
        cache.set('sitemap', sitemapData, 3600 * 24);
        ep.emit('sitemap', sitemapData);
      });
    }
  }));
};

exports.appDownload = function (req, res, next) {
  res.redirect('https://github.com/soliury/noder-react-native/blob/master/README.md')
};
