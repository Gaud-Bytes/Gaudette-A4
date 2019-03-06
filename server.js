const express = require('express');
const app = express();

// install session module first using 'npm install express-session'
var session = require('express-session'); 

var mysql = require('mysql');
var result = {};

const conInfo = 
{
    host: process.env.IP,
    user: process.env.C9_USER,
    password: "",
    database: "RESULTSDB"
};

app.use(session({ secret: 'happy jungle', 
                  resave: false, 
                  saveUninitialized: false, 
                  cookie: { maxAge: 60000 }}))

app.get('/', instructions);                  
app.get('/game', game);
app.get('/stats', stats);
app.listen(process.env.PORT,  process.env.IP, startHandler())

function startHandler()
{
  console.log('Server listening on port ' + process.env.PORT)
}

function game(req, res)
{
  try
  {
    // if we have not picked a secret number, restart the game...
    if (req.session.answer == undefined)
    {
      req.session.guesses = 0;
      req.session.answer = Math.floor(Math.random() * 100) + 1;
    }
      
    // if a guess was not made, restart the game...
    if (req.query.guess == undefined)
    {
      writeResult(res, {'gameStatus' : 'Pick a number from 1 to 100.'}); 
      req.session.guesses = 0;
      req.session.answer = Math.floor(Math.random() * 100) + 1;
    }
    // a guess was made, check to see if it is correct...
    else if (req.query.guess == req.session.answer)
    {
      req.session.guesses = req.session.guesses + 1;
      writeResult(res, {'gameStatus' : `Correct! It took you ${req.session.guesses} guesses. Play Again!`}); 
      req.session.answer = undefined;
      
       if (req.session.guesses == undefined)
        console.log('Error 1');
        //writeResult(res, {'error' : "error"});
      else
      {
        let guess = parseInt(req.session.guesses);
        var con = mysql.createConnection(conInfo);
        con.connect(function(err) 
        {
          if(err)
            console.log('Error 2');
            //writeResult(res, {'error' : err});
          else
          {
            con.query('INSERT INTO RESULTS (GUESS_NUM) VALUES (?)', [guess], function (err, result, fields)
            {
                if (err) 
                  console.log('Error 3');
                 // writeResult(res, {'error' : err});
                else
                  req.session.guesses = guess;
                  
            });
            
          }
           
        });
      }

    }
    // a guess was made, check to see if too high...
    else if (req.query.guess > req.session.answer)
    {
      req.session.guesses = req.session.guesses + 1;
      writeResult(res, {'gameStatus' : 'To High. Guess Again!', 'guesses' : req.session.guesses}); 
    }
    // a guess was made, it must be too low...
    else
    {
      req.session.guesses = req.session.guesses + 1;
      writeResult(res, {'gameStatus' : 'To Low. Guess Again!', 'guesses' : req.session.guesses}); 
    };
  }
  catch (e)
  {
    writeResult(res, {'error' : e.message});
  }
  
        
 
}

function instructions(req, res)
{
  res.writeHead(200, {'Content-Type': 'text/html'});
  res.write("<h1>Number Guessing Game</h1>");
  res.write("<p>Use /game to start a new game.</p>");
  res.write("<p>Use /game?guess=num to make a guess.</p>");
  res.write("<p>Use /stats to see your stats </p>");
  res.end('');
}

function stats(req, res)
{
  
  let result = {};
  if(req.session.answer == undefined)
    req.session.guesses = 0;
  
  if (req.session.guesses == undefined)
    writeResult(res, {'error' : "please make a guess"});
  else
  {
    var con = mysql.createConnection(conInfo);
    con.connect(function(err) 
    {
      if(err)
         writeResult(res, {'error' : err});
      else
      {
        let guess = {};
        con.query('SELECT MIN(GUESS_NUM) AS best, MAX(GUESS_NUM) AS worst, COUNT(GUESS_NUM) AS games FROM RESULTS', function (err, guess, fields)
        {
          
          
            if (err) 
              writeResult(res, {'error' : err});
            else
            {
              result = {'stats': {'best': guess[0].best, 'worst': guess[0].worst, 'games': guess[0].games}};
              
              writeResult(res, result);
            }
            
          
        });
        
      }
       
    });
  }
  
  
}

function writeResult(res, obj)
{
  res.writeHead(200, {'Content-Type': 'application/json'});
  res.write(JSON.stringify(obj));
  res.end('');
}

