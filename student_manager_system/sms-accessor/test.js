'use_strict'
const sms = require('./sms-accessor');
const fs = require("fs");

const path = require('path');
const SMS_APP_FOLDER = path.join(
  process.env.APPDATA,
  'Sms',
  'data',
);

sms.initialize(SMS_APP_FOLDER, 5);
sms
.on('abort',
    e => {
      console.log('smsAccessor aborted: ', e);
    })
.on('error', e => {
  console.log('smsAccessor error: ', e);
});

async function testGetSchools() {
  console.log("-----------------------------------------");
  console.time("getSchools");
  const response = await sms.getSchools();
  console.log(JSON.stringify(response, null, 2));
  console.timeEnd("getSchools");
  console.log("-----------------------------------------\n");
}

async function testGetSchoolDetail() {
  console.log("-----------------------------------------");
  console.time("testGetSchoolDetail");
  const response = await sms.testGetSchoolDetail(28);
  console.log(JSON.stringify(response, null, 2));
  console.timeEnd("testGetSchoolDetail");
  console.log("-----------------------------------------\n");
}

async function testall() {
  await testGetSchools();
  await testGetSchoolDetail();
}

testall().then(()=>{
  sms.finalize();
  console.log('finish');
}).catch(e=>{
  sms.finalize();
  console.log(e);
});
