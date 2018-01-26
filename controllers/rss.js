var config       = require('../config');
var convert      = require('data2xml')();
var Question        = require('../proxy').Question;
var cache        = require('../common/cache');
var renderHelper = require('../common/render_helper');
var eventproxy   = require('eventproxy');

exports.index = function (req, res, next) {
  if (!config.rss) {
    res.statusCode = 404;
    return res.send('Please set `rss` in config.js');
  }
  res.contentType('application/xml');

  var ep = new eventproxy();
  ep.fail(next);

  cache.get('rss', ep.done(function (rss) {
    if (!config.debug && rss) {
      res.send(rss);
    } else {
      var opt = {
        limit: config.rss.max_rss_items,
        sort: '-create_at',
      };
      Question.getQuestionsByQuery({tab: {$nin: ['dev']}}, opt, function (err, questions) {
        if (err) {
          return next(err);
        }
        var rss_obj = {
          _attr: { version: '2.0' },
          channel: {
            title: config.rss.title,
            link: config.rss.link,
            language: config.rss.language,
            description: config.rss.description,
            item: []
          }
        };

        questions.forEach(function (question) {
          rss_obj.channel.item.push({
            title: question.title,
            link: config.rss.link + '/question/' + question._id,
            guid: config.rss.link + '/question/' + question._id,
            description: renderHelper.markdown(question.content),
            author: question.author.loginname,
            pubDate: question.create_at.toUTCString()
          });
        });

        var rssContent = convert('rss', rss_obj);
        rssContent = utf8ForXml(rssContent)
        cache.set('rss', rssContent, 60 * 5); // 五分钟
        res.send(rssContent);
      });
    }
  }));
};

function utf8ForXml(inputStr) {
  return inputStr.replace(/[^\x09\x0A\x0D\x20-\xFF\x85\xA0-\uD7FF\uE000-\uFDCF\uFDE0-\uFFFD]/gm, '');
}
