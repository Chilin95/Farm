let a = 1;
let b = 2;

module.exports={
    a,
    b,
    excute() {
        b = b+1;
        if (a === 1) {
            a = 2;
            return excute();
        }
    },

    getB(){
        return b;
    }

};

function excute(){
    b = 10;
}