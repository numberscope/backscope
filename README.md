# NumberscopeFlask

## Installing Dependencies

### Getting Python Setup

You will need:
- Python 3
- Pip package installer 

I recommend using Anaconda to manage python packages. To install, follow these instructions:
 https://docs.anaconda.com/anaconda/install/
 
### Installing the necessary packages
 
 Simply run 
 ```console 
pip install -r requirements.txt
 ```
on the command line

### Deveploment

To work on the frontend you will need
- Node.js
- Gulp

Gulp is used to compile SCSS to CSS and to handle bundling and minifying of the JavaScript. If you won't be working on these elements, you don't really need to both with this. Just be aware that any changes you make to the `src` files won't be reflected on the web page until they are compiled by Gulp.

### Installing Node Packages and Gulp

If you don't have Gulp installed, you will need that. To install it as a global utility:

```console
npm install gulp-cli -g
```

This will allow you to run gulp from the command line. Once that is done, npm will handle installing it locally for development.

```console
npm install
```

To run, type `gulp` into the command line while in the top level directory. This will start a watcher (a process that will monitor all relevant files in the directory for changes) and will compile/bundle/move files as they are saved, on the fly.

## To run

```console
./run.sh
```


