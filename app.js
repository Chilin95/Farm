// const set1 = new Set();

// set1.add({'a':'1'});
// set1.add({'b':'2'});
// set1.add({'a':'1'});
// set1.add({'b':'1'});

// console.log(set1);

const map1 = new Map();
map1.set('a','1');
map1.set('a','1');
map1.set('b','2');
map1.set('b','2');
console.log(map1);
console.log(map1.get('a'));

const file2 = 'hahah';
const file = '2020-15-24';

let obj= {key1:file2, key2:file};
for (let[k,v] of map1) {
    obj[k] = v;
}

let obj2 = {};
obj2[file] = obj;

str = JSON.stringify(obj2);
console.log(str);

