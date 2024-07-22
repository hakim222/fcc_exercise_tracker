require('dotenv').config()
const express = require('express')
const cors = require('cors')
const bodyParser = require('body-parser')
const datefns = require('date-fns')
let mongoose = require('mongoose')
const app = express()

app.use(cors())
app.use(express.static('public'))
app.use(bodyParser.urlencoded({extended: false}));
app.use(bodyParser.json());

mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true });

let userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true
  }
})

let exerciseSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  description: {
    type: String,
    required: true
  },
  duration: {
    type: Number,
    require: true
  },
  date: Date
})

let User = mongoose.model('User', userSchema);
let Exercise = mongoose.model('Exercise', exerciseSchema);

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});

app.post('/api/users', async (req, res)=>{
  var postedUsername = req.body.username;
  try{
    const existingUser = await User.findOne({ username: postedUsername });
    if (existingUser) {
      return res.json({username: existingUser.username, _id: existingUser._id});
    }
    const newUser = new User({username: postedUsername})
    await newUser.save();
    return res.json({username: newUser.username, _id: newUser._id});
  }
  catch(err){
    res.status(500).send(err);
  }
})

app.get('/api/users', async (req, res)=>{
  try{
    const users = await User.find();
    res.status(200).json(users);
  }
  catch(err){
    res.status(500).send(err);
  }
})

app.post('/api/users/:_id/exercises', async (req,res)=>{
  var posted_id = req.params._id;
  var posted_description = req.body.description;
  var posted_duration = Number(req.body.duration);
  var posted_date = req.body.date;
  if (!posted_date) posted_date = datefns.format(new Date(), 'yyyy-MM-dd');
  try{
    const existingUser = await User.findOne({ _id: posted_id });
    if (!existingUser) {
      return res.json({error: "Specified user id does not exist"});
    }
    const newExercise = Exercise({userId: posted_id, description: posted_description, duration: posted_duration, date: posted_date})
    await newExercise.save();

    const parsedDate = datefns.parseISO(posted_date);
    const formattedDate = datefns.format(parsedDate, 'EEE MMM dd yyyy');

    res.json({"_id": posted_id, username: existingUser.username, date: formattedDate, duration: posted_duration, description: posted_description})
  }
  catch(err){
    res.status(500).send(err);
  }
})

app.get('/api/users/:_id/logs', async (req,res)=>{
  var posted_id = req.params._id;
  const from = req.query.from ? datefns.format(new Date(req.query.from), 'yyyy-MM-dd') : null;
  const to = req.query.to ? datefns.format(new Date(req.query.to), 'yyyy-MM-dd') : null;
  var limit = Number(req.query.limit)||null;
  try {
    const existingUser = await User.findOne({ _id: posted_id });
    if (!existingUser) {
      return res.json({error: "Specified user id does not exist"});
    }
    const query = { userId: posted_id };
    if (from) {
      query.date = { ...query.date, $gte: from };
    }
    if (to) {
      query.date = { ...query.date, $lte: to };
    }
    const logs = await Exercise.find(query).limit(limit);
    const formatted_logs = logs.map((log)=>{
      return {
        description: log.description,
        duration: log.duration,
        date: datefns.format(log.date, "EEE MMM dd yyyy"),
      };

    })
    //res.json(logs);
    return res.json({_id: existingUser._id, username: existingUser.username, count: logs.length, log: formatted_logs});
  }
  catch(err){
    res.status(500).send(err);
  }
})

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})
