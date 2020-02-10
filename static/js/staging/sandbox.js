function start(setup){
    moduleObj = { 
        ID: 0,
        moduleKey: setup.moduleKey ,
        config: setup.config
    };
    seqObj = {
        ID: 0,
        inputType: setup.seqtype,
        inputValue: setup.sequence,
        parameters: setup.parameters
    };
    NScore.receiveSequence( seqObj );
    NScore.receiveModule( moduleObj );

    NScore.begin( [{seqID:0, toolID: 0}] );
}

start( setup );
