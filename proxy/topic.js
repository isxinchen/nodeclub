var EventProxy = require('eventproxy');
var models     = require('../models');
var Topic      = models.Topic;
// var User       = require('./user');
// var Answer      = require('./answer');
var tools      = require('../common/tools');
var at         = require('../common/at');
var _          = require('lodash');

exports.getTopicByName = function (name, callback) {
  Topic.findOne({name: name}, callback);
}

exports.newAndSave = function (title, description, authorId, callback) {
  var topic = new Topic();
  topic.title = title;
  topic.description = description;
  topic.author_id = authorId;
  
  topic.save(callback);
}