
'use strict';

var mongoose = require('mongoose')
var id = mongoose.Types.ObjectId()
var path = require('path')
var dotenv = require('dotenv').config()
var ObjectId = require('mongodb').ObjectID;

// mongoose connection
mongoose.connect(process.env.DB, {useNewUrlParser: true, useFindAndModify: false, useUnifiedTopology: true, useCreateIndex: true})

// mongoose Schema
const Schema = mongoose.Schema
const threadSchema = new Schema({
  text: {type: String, required: true},
  reported: {type: Boolean, required: true, default: false},
  delete_password: {type: String, required: true},
  replycount: {type: Number, default: 0},
  replies: [Object],
}, {
  timestamps: {
    createdAt: 'created_on',
    updatedAt: 'bumped_on'
  }
})

const Thread = mongoose.model('Thread', threadSchema)

module.exports = function (app) {
  
  // create thread
  app.route('/api/threads/:board').post((req, res) => {
    let newThread = new Thread({
      text: req.body.text,
      delete_password: req.body.delete_password
    })
    newThread.save()
      .then(() => res.redirect(`/b/${req.body.board}`))
      .catch(err => console.log(err))
  
  })  
   // list recent threads
 .get((req, res) => {
    Thread.find({}, {delete_password: 0, reported: 0, replies: {$slice: 3}}).sort({bumped_on: -1}).limit(10)
      .then((d) => res.json(d))
      .catch(err => console.log(err))
  })
  // delete a thread with password
  .delete((req, res) => { 
    Thread.findOneAndDelete({_id: req.body.thread_id, delete_password: req.body.delete_password}, function(err, data) {
      if(err) return res.status(400).json('cannot delete this thread')
      return res.json(data ? 'success':'incorrect password')
      
    })
  })
  // report a thread
  .put((req, res) => {
    Thread.findOneAndUpdate({_id: req.body.thread_id}, {$set: {reported: true}})
      .then(() => res.json('success'))
      .catch(() => {
        return res.status(400).json('cannot report this thread');
      })
  })

  // create reply
  app.route('/api/replies/:board').post((req, res) => {
    let newReplies = {
      _id: new ObjectId(),
      text: req.body.text,
      created_on: new Date(),
      delete_password: req.body.delete_password,
      reported: false
    }
    Thread.findOneAndUpdate({_id: req.body.thread_id}, {$inc: {replycount: 1}, $push: {
      replies: {
        $each: [newReplies],
        $sort: {created_on: -1}
      }
    }})
      .then(() => res.redirect(`/b/${req.params.board}/${req.body.thread_id}`))
      .catch(err => console.log(err))
   
  })
  // show all replies on thread
 .get((req, res) => {
    Thread.findOne({_id: req.query.thread_id}, {delete_password: 0, reported: 0, __v: 0, "replies.delete_password": 0, "replies.reported": 0})
      .then((d) => res.json(d))
      .catch(err => console.log(err))
  })
  // change reply to [deleted] on thread
  .delete((req, res) => {

    Thread.findOneAndUpdate({_id: ObjectId(req.body.thread_id), 'replies._id': ObjectId(req.body.reply_id), 'replies.delete_password': req.body.delete_password}, {$set: {
      "replies.$.text": '[deleted]'
    }}).then((d) => {
        return res.json(d ?'success':'incorrect password');
    }).catch(() => res.status(400).json('cannot delete this reply'))
  })
  // report a reply on thread
  .put((req, res) => {
    Thread.findOneAndUpdate({_id: req.body.thread_id, 'replies._id': ObjectId(req.body.reply_id)}, {$set: {'replies.$.reported': true}}).then(() => res.json('success')).catch(() => {
      return res.status(400).json('cannot report this reply');
    })
  })
  
};