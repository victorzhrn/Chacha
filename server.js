var express = require('express');
var app = express();

var bodyParser = require('body-parser');
var cookieParser = require('cookie-parser');
app.use(bodyParser.urlencoded({extended: true}));
app.use(cookieParser());

var http = require('http').Server(app);
var port = 3000;

var io = require('socket.io')(http);

var pg = require('pg');
pg.defaults.host = '/var/run/postgresql';

app.get('/',function(req,res){
	if('login' in req.cookies)
		res.redirect('/user');
	else
		res.sendFile(__dirname+'/file/index.html');
})

app.post('/validate', function(req, res){
	email = req.body['email'];
	password = req.body['password'];

	var client = new pg.Client();
	client.connect();
	var queryText = 'SELECT Password ' +
			'FROM ACCOUNT ' +
			'WHERE Email=$1';
	var execution = client.query({
		text: queryText,
		values: [email]
	});

	
	execution.on('row',function(row, result){
		result.addRow(row);
	});
	execution.on('end',function(result){
		client.end();
		var selection = result['rows'];
		var validation = null;
		if(selection.length < 0)
			res.redirect('/error?code=1');
		else if(selection[0]['password'] != password)
			res.redirect('/error?code=2');
		else{
			SESSION_LENGTH = 1000 * 60;
			res.cookie('login', email,
				   {maxAge: SESSION_LENGTH});
			res.redirect('/user');
		}
	});
});

app.get('/user', function(req,res){
	if('login' in req.cookies){
		email = req.cookies['login'];
		var client = new pg.Client();
		client.connect();
		var queryText = 'SELECT Name ' +
				'FROM ACCOUNT ' +
				'WHERE Email=$1';
		var execution = client.query({
			text: queryText,
			values: [email]
		});

		execution.on('row', function(row, result){
			result.addRow(row);
		});
		execution.on('end', function(result){
			client.end();
			var name = result['rows'][0]['name'];
			res.send('Hello, ' + name +
				 '<br>' +
				 '<input type=\'button\' value=\'Sign out\'' +
				 ' onclick = \'window.location="/signout"\'>');
		});
	}else
		res.redirect('/error?code=3');
});

app.get('/signout', function(req, res){
	res.cookie('login','',
		   {maxAge: -1});
	res.redirect('/');
});

app.get('/registration', function(req, res){
	res.sendFile(__dirname + '/file/registration.html');
});

app.post('/registration', function(req, res){
	var check = true;
	for(term in req.body){
		if(req.body[term] == '')
			check = false;
	}
	
	if(check){
		email = req.body['email'];
		password = req.body['password'];
		name = req.body['name'];
		phone_number = req.body['phone_number'];

		var client = new pg.Client();
		client.connect();
	
		var queryText = 'INSERT INTO ACCOUNT ' +
			    	'VALUES ($1, $2, $3, $4)';
		var execution = client.query({
			text: queryText,
			values: [email, password, name, phone_number]
		});
	
		execution.on('error', function(error){
			client.end();
			if(error['code'] == '23505')
				res.redirect('/error?code=4');
			else
				res.redirect('/error?code=0&dbcode=' + 
					     error['code']);
		});
		execution.on('end', function(){
			client.end();
			res.redirect('/registrationComplete');
		});
	}else
		res.redirect('/error?code=5');
});

app.get('/registrationComplete', function(req, res){
	res.send('Registration complete' +
		 '<br>' + 
		 '<a href=\'/\'>Log in</a>');
});

app.get('/error', function(req, res){
	res.send('Error encuntered');
});

app.listen(port, function(){
	console.log('Server running on port %d', port);
});
