// test for native method(NAN)

const self = require('.');

async function test() {

  //test Print Dialog
  let result0 = await self.printing.getDefaultPrintSetting();
  console.log(result0);
  let result1 = await self.printing.showPrintSetupDialog(null, null, null);
  console.log(result1);
  let result2 = await self.printing.showPrintSetupDialog(null, result1.devmode, result1.devname);
  console.log(result2);
  let result3 = await self.printing.getPrintDetail(result2.devmode, result2.devname);
  console.log(result3);
  
  // test font Dialog
  var result_1 = await self.nativeUi.showDialog(null, null, 0);
  console.log( result_1 );
  var result_2 = await self.nativeUi.showDialog(null, result_1.fontBinary, 1);
  console.log( result_2 );
  var result_3 = await self.nativeUi.getFontParameter(result_2.fontBinary);
  console.log( result_3 );

  // test color picker Dialog
  var result_11 = await self.colorPicker.showDialog(null, "#FE23AC", 0);
  console.log( result_11 );
  var result_12 = await self.colorPicker.showDialog(null, result_11.original, 1);
  console.log(result_12);
  var result_13 = await self.colorPicker.showDialog(null, result_12.original);
  console.log(result_13);

  try {
    // Wrong arguments is array buffer
    self.nativeUi.showDialog(null, "result2", 0);
    console.log('fail');
  } catch(e) {
    console.log('success!(throw error)', e);
  }
};

test();