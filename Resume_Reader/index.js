"use strict";
var readline=require ('readline-sync');
var pdfreader = require('pdfreader');
var fs = require('fs');
var MongoClient = require('mongodb').MongoClient;
var url = "mongodb://localhost:27017/Resume";
//var uri = "mongodb://rrkz:king0$Tom@localhost:27017/admin";
var db;

var rows = {}; // indexed by y-position
MongoClient.connect(url, function(err, db1) {
    if (err) throw err;
    console.log("Mongo Connection Successful..");
    db=db1;
    //console.log(db);
    //console.log(db.collection("CV").findOne( { 'technical_skills.programming_languages': "JavaScript" }));
    read_files_in_directory('./tests');
});

//read_pdf('N120298.pdf')
function read_files_in_directory(testFolder) {
    var file;
    fs.readdir(testFolder, (err, files) => {
        files.forEach(file => {
            if(file.indexOf('.pdf')>-1){
                read_pdf(file);
            }
        });
    });
}
function read_pdf(pdf_name) {
    var ans='';
    new pdfreader.PdfReader().parseFileItems('./tests/'+pdf_name, function(err, item){
        if (!item || item.page) {
            ans=printRows(ans);
            if(!item)
                extract_details(ans);
            rows = {}; // clear rows for next page
        }
        else if (item.text) {
            // accumulate text items into rows object, per line
            (rows[item.y] = rows[item.y] || []).push(item.text);
        }
    });
}

function printRows(ans) {
    Object.keys(rows) // => array of y-positions (type: float)
        .sort((y1, y2) => parseFloat(y1) - parseFloat(y2)) // sort float positions
        .forEach((y) => ans=ans+'\n'+((rows[y] || []).join('?')));
    return ans;
}

function extract_details(data) {
    var user={};
    //console.log(data)
    var re_name=/Name(.*):(.*)/g;
    var name=data.match(re_name)[1].replace(/Name(.*):/i,'').replace(/\?/g,' ').trim();
    user.name=name;
    //console.log(user.name)
    var re_email = /Mail ID(.*):/i;
    var email =re_email.exec(data)[1].split(':')[1].trim().split(' ')[0].replace(/\?/g,'').trim();
    user.email=email;
    //console.log(user.email)

    var re_mobile = /Mobile(.*)/i;
    var mobile =re_mobile.exec(data)[1].split(':')[1].replace(/\?/g,'').trim();
    user.mobile=mobile;
    //console.log(user.mobile)


    var re_edu=/Educational Qualifications(\n.*?)*Technical/gi;
    var edu=re_edu.exec(data)[0].split('\n');
    var btech=edu[2].split('?');
    edu[3]=edu[3].split('?');
    edu[5]=edu[5].split('?');
    var education={};

    var degree={};
    degree.name=btech[0].split(' ')[0]+btech[0].split(' ')[1].trim();
    degree.institute=btech[1].replace(/\?/g,'').trim();
    degree.from=parseInt(btech[2].trim());
    degree.to=parseInt(btech[4].trim());
    degree.cgpa=parseInt(btech[5].trim());
    degree.class=btech[6].trim();
    education.degree=degree;
    //console.log(degree)

    var inter={};
    inter.name=edu[3][0].trim()+edu[3][1].trim()+edu[3][2].trim()+edu[4].trim();
    inter.institute=edu[3][3].replace(/\?/g,'').trim();
    inter.from=parseInt(edu[3][4].trim());
    inter.to= parseInt(edu[3][6].trim());
    inter.cgpa=parseInt(edu[3][7].trim());
    inter.class=edu[3][8].trim();
    education.inter=inter;
    //console.log(inter)

    var school={};
    school.name=edu[5][0]+edu[6].replace(/\?/g,' ');
    school.institute=edu[5][1]+edu[5][2]+edu[5][3].replace(/\?/g,'').trim();
    school.from=parseInt(edu[5][4].trim());
    school.to=parseInt(edu[5][6].trim());
    school.cgpa=parseInt(edu[5][7].trim());
    school.class=edu[5][8].trim();
    education.school=school;
    //console.log(school)

    user.education=education;
    //console.log(user.education)

    var re_tech=/Technical(.*)(\n(.*?))*Academic/gi;
    var tech=re_tech.exec(data)[0];
    var prog=/Programming(.*?)\n/gi.exec(tech)[0];
    prog=prog.split(':')[1].trim().replace(/\?/g,'').split(',').map(function(item){ return item.trim()});
    var database=/Data(.*?)\n/gi.exec(tech)[0];
    database=database.split(':')[1].trim().replace(/\?/g,'').split(',').map(function (item) {return item.trim()});
    var os=/Operating(.*?)\n/gi.exec(tech)[0];
    os=os.split(':')[1].trim().replace(/\?/g,'').split(',').map(function (item) {return item.trim()});
    var web=/Web(.*?)\n/gi.exec(tech)[0];
    web=web.split(':')[1].trim().replace(/\?/g,'').split(',').map(function (item) {return item.trim()});
    var technical={};
    technical.programming_languages=prog;
    technical.databases=database;
    technical.os=os;
    technical.web=web;
    //console.log(technical)

    user.technical_skills=technical;


    var re_exp = /Work Experience(\n(.*))*Areas of Interest/gi;
    var exp=re_exp.exec(data)[0].split('\n');
    var experiance=[];
    var temp={};
    exp[1]=exp[1].replace(/\?/g,'');
    exp[2]=exp[2].replace(/\?/g,'');
    temp.duration=parseInt(/\d+/.exec(exp[1])[0]);
    temp.about=exp[1].split(temp.duration)[1].replace(/\?/g,'').replace('Days','').trim();
    experiance.push(temp);
    var temp={};
    temp.duration=parseInt(/\d+/.exec(exp[2])[0]);
    temp.about=exp[2].split(temp.duration)[1].replace(/\?/g,'').replace('Days','').trim();
    experiance.push(temp);

    user.experiance=experiance;
    save_user(user)
    //console.log(user)
}
function save_user(user) {
      db.collection('CV').save(user,function (err,res) {
        if(err)
            throw err;
        else{
            console.log('user data saved');
            db.close();
        }
    },{text:true});
}
MongoClient.connect(url, function(err, db) {
  if (err) throw err;
  var db = db.db("Resume");
  var tech = readline.question('Technologies ?');
  console.log("hi"+tech);
  db.collection("CV").find({ 'technical_skills.programming_languages':tech }).toArray(function(err, result) {
    if (err) throw err;
    console.log(result);
    db.close();
  });
});
