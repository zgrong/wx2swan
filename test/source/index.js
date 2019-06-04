wx.navigateTo({
    url: '../logs/logs'
});
const name = 'yican';

// test api exist check in logical expression
if (wx.checkIsSupportSoterAuthentication && true) {
    console.log(true);
}

// test wx as function arg
Object.create(wx, {});
console.log(1, wx);

// test UnaryExpression
if (!wx.checkIsSupportSoterAuthentication) {
    console.log(true);
}
if (typeof wx.checkIsSupportSoterAuthentication !== 'function') {
    console.log(true);
}

const wx = {};
for (const key in wx) {
    console.log(`wx${key}:`, wx[key]);
}
while (wx) {
    console.log(`wx${key}:`, wx[key]);
}

wx.aaa = 111;
wx['bbb'] = 222;
wx[ccc] = 333;

console.log('__route__:', currentPage.__route__);
console.log('__route__:', currentPage['__route__']);
console.log('__route__:', currentPage[__route__]);
console.log('__route__:', arr[arr.length - 1].__route__);

let data = wx.getExtConfigSync();
data = wx.getExtConfigSync().ext;
data = aaa[bbb].getExtConfigSync();
data = wx.getExtConfigSync().extConfig;

wx['test'].call(wx, {url: 'test'});
wx.test(wx.testFn, wx);

/* eslint-disable */
Component({
    behaviors: ['wx://form-field', 'wx://component-export']
});
/* eslint-enable */
