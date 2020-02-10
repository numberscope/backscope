Getting the input from the user interface and parsing it is kinda tricky in the code but this is how it's done generally

1. There is a currentSequence object object at the top of toolpage.js.  When a user looks at a sequence n, the currentSequence is set to the nth sequence with setID(n) (toolpage.js), so we know which input we're looking at.
2. when they choose an input type (only builtIn works now) the type is also set for currentSequence with setType (toolpage.js). 
3. Once the user enters parameters for the sequence (if any), and moves on to another sequence or to the visualization tools panel, then currentSequence the user worked on is sent to NScore with NScore.receiveSequence (NScore.js). 
4. In NScore.receiveSequence, we look at the type of the sequence, parse the parameters, and initialize the appropriate sequence (Sequence.js) which will put an instance of the Sequence class in NScore.preparedSequences

The same is true for the viz tools, although we use the MODULES object in step 4 to find the correct module.