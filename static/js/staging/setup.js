

/*
    ----------------------------------------------------------------------------
    
    Built in sequences available:

    Fibonacci
    Lucas
    Primes
    Naturals
    LinRec
    Primes

    OEIS sequences:

    check the validOEIS.js file or
    https://github.com/sagemath/sagelib/blob/master/sage/combinat/sloane_functions.py

    Additionally you can add your own with "npm run init_sequence" ( or follow the steps and do it manually)
    and then include the sequence key in the setup object (the key is the short hand used to index it in builtInSeqs)

    ----------------------------------------------------------------------------

    modules available: 

    Turtle
    Differences
    ShiftCompare
    ModFill

    Additionally you can add your own with "npm run init_module" ( or follow the steps and do it manually)
    and then include the module key in the setup object (the key is the short hand used to index it in MODULES)

*/


setup ={
    sequence: 'Primes',
    seqtype: 'builtIn',
    parameters: {
      m: 5
    },
    moduleKey: 'FractalMap',
    config: {
        n: 20,
        Levels: 2
    },
};

// setup = {
//     sequence: 'A005132', // Recaman
//     seqtype: 'OEIS',
//     moduleName: 'ModFill',
//     config: {
//          modDimension: 100
//     },
// }

// setup = {
//     sequence: [2,3,5,7], // barely a sequence, but just to demonstrate you can use a list
//     seqtype: 'list',
//     moduleName: yourModule,
//     yourConfig: {
//         yourParam1: someValue1,
//         yourParam2: someValue2
//     },
// }


// setup ={
//     sequence: 'Fibonacci',
//     seqtype: 'builtIn',
//     parameters: {
//         m: 5 // '' means empty argument
//     },
//     moduleKey: 'Differences',
//     config: {
//         n: 20,
//         Levels: 2
//     },
// };
