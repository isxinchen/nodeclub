var mongoose  = require('mongoose');
var BaseModel = require("./base_model");
var Schema    = mongoose.Schema;
var ObjectId  = Schema.ObjectId;

/*
 * type:
 * answer: xx 回复了你的话题
 * answer2: xx 在话题中回复了你
 * follow: xx 关注了你
 * at: xx ＠了你
 */

var MessageSchema = new Schema({
  type: { type: String },
  master_id: { type: ObjectId},
  author_id: { type: ObjectId },
  question_id: { type: ObjectId },
  answer_id: { type: ObjectId },
  has_read: { type: Boolean, default: false },
  create_at: { type: Date, default: Date.now }
});
MessageSchema.plugin(BaseModel);
MessageSchema.index({master_id: 1, has_read: -1, create_at: -1});

mongoose.model('Message', MessageSchema);
