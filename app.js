var express = require("express");
var app = express();

/**
 * Static folders and directories to be used
 */

app.use('/', express.static(__dirname + '/www'));
app.use('/js', express.static(__dirname + '/node_modules/bootstrap/dist/js'));
app.use('/js', express.static(__dirname + '/node_modules/jquery/dist'));
app.use('/css', express.static(__dirname + '/node_modules/bootstrap/dist/css'));
app.use('/images', express.static(__dirname + '/images'))
app.use('/css', express.static(__dirname + '/css'))

var bodyParser = require("body-parser");
var flash = require("connect-flash");

/**
 * Source: https://www.npmjs.com/package/stopword
 */

var stopWord = require("stopword");

app.use(bodyParser.urlencoded({extended: true}));
app.use(bodyParser.json());
app.locals.moment = require('moment');
var mongoose = require("mongoose");
var passport = require("passport");
var lodash = require("lodash");

var LocalStrategy = require("passport-local");
var passportLocalMongoose = require("passport-local-mongoose");
methodOverride = require("method-override");
expressSanitizer = require("express-sanitizer");

app.set("view engine", "ejs");
app.use(methodOverride("_method"));
app.use(expressSanitizer());
app.use(flash());
var ObjectId = require('mongodb').ObjectId;

/**
 * Encoding password for users
 */

app.use(require("express-session")({
    secret: "this app belongs to aarush",
    resave: false,
    saveUninitialized: false
}));

/**
 * Response Messages via flash
 */

app.use(function (req, res, next) {
    res.locals.currentUser = req.user;
    res.locals.error = req.flash("error");
    res.locals.success = req.flash("success");
    res.locals.warning = req.flash("warning");
    next();
})

/**
 * Mongo Connection
 */

mongoose.connect("mongodb+srv://aarushg94:aarushgpassword@socialwebapp-bo1nb.mongodb.net/test?retryWrites=true&w=majority", {
    useNewUrlParser: true,
    useUnifiedTopology: true
});

var conn = mongoose.connection;

/**
 * Schema setup for User
 */

var UserSchema = new mongoose.Schema({
    username: String,
    password: String,
}, {
    versionKey: false
});

UserSchema.plugin(passportLocalMongoose);
var User = mongoose.model("User", UserSchema);

app.use(passport.initialize());
app.use(passport.session());
passport.use(new LocalStrategy(User.authenticate()));
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

app.use(function (req, res, next) {
    res.locals.currentUser = req.user;
    next();
})

/**
 * Schema for upVotes
 */

var upVoteSchema = new mongoose.Schema({
    ucount: Number,
    createdAt: {type: Date, default: Date.now()},
    author: {
        id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User"
        },
        username: String
    }
}, {
    versionKey: false
});

var UpVote = mongoose.model("Upvote", upVoteSchema);

/**
 * Schema for likes
 */

var likeSchema = new mongoose.Schema({
    lcount: Number,
    createdAt: {type: Date, default: Date.now()},
    author: {
        id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User"
        },
        username: String
    }
}, {
    versionKey: false
});

var Like = mongoose.model("Like", likeSchema);

/**
 * Schema setup for recipes
 */

var recipeSchema = new mongoose.Schema({
    recipeName: String,
    recipeURL: String,
    recipeInstructions: String,
    stopWordsDescription: String,
    createdAt: {type: Date, default: Date.now()},
    author: {
        id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User"
        },
        username: String
    },
    comments: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "Comment"
    }],
    likes: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
    }],
    upvotes: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
    }]
}, {
    versionKey: false
});

var Recipe = mongoose.model("Recipe", recipeSchema, "recipesDetails");

/**
 * Schema setup for userSuggestions
 */

var userSuggestions = new mongoose.Schema({
    userId: String,
    suggestionsList: []
}, {
    versionKey: false
});

var UserSuggestions = mongoose.model("UserSuggestions", userSuggestions, "userSuggestions");

/**
 * Schema setup for userSuggestions
 */

var averageUserProfile = new mongoose.Schema({
    userId: String,
    wordList: []
}, {
    versionKey: false
});

var AverageUserProfile = mongoose.model("averageUserProfile", averageUserProfile, "averageUserProfile");


/**
 * Schema setup for comments
 */

var commentSchema = new mongoose.Schema({
    text: String,
    createdAt: {type: Date, default: Date.now()},
    author: {
        id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User"
        },
        username: String
    }
}, {
    versionKey: false
});

var Comment = mongoose.model("Comment", commentSchema);

/**
 * Landing page for the application
 */

app.get("/", function (req, res) {
    User.find({}, function (error, users) {
        if (error) {
            console.log(error);
        } else {
            Comment.find({}, function (error, comments) {
                if (error) {
                    console.log(error);
                } else {
                    Recipe.find({}, function (error, recipes) {
                        if (error) {
                            console.log(error)
                        } else {
                            // res.render("landing", {users: users, comments: comments, recipes: recipes});
                            res.redirect("/recipes");
                        }
                    })
                }
            })
        }
    });
})

/**
 * Add a new recipe route
 */

app.post("/recipes", isLoggedIn, function (req, res) {
    var recipename = req.body.recipeName;
    var recipeURL = req.body.recipeURL;
    var recipeInstructions = req.body.recipeInstructions;
    var nonStopWords = escapeRegex(recipeInstructions);
    const words = nonStopWords.split(' ');
    var searchWords = stopWord.removeStopwords(words, stopWords);
    var correctWordsArray = [];
    for (var i = 0; i < searchWords.length; i++) {
        if (searchWords[i] != '') {
            if (!correctWordsArray.includes(searchWords[i])) {
                correctWordsArray.push(searchWords[i].toLowerCase());
            }
        }
    }
    var author = {
        id: req.user._id,
        username: req.user.username
    }
    var newRecipe = {
        recipeName: recipename,
        recipeURL: recipeURL,
        recipeInstructions: recipeInstructions,
        stopWordsDescription: correctWordsArray.toString(),
        author: author
    };
    Recipe.create(newRecipe, function (err, Recipe) {
        if (err) {
            console.log(err);
        } else {
            req.flash("success", "New Recipe Added")
            res.redirect("/recipes");
        }
    })
});

/**
 * Add a new recipe form route
 */

app.get("/recipes/new", isLoggedIn, function (req, res) {
    res.render("addrecipe");
})

/**
 * Sort algorithm
 */

/**
 * If collectionmatch is defined then we want to execute the code
 * inside the block, since collectionmatch is the main object containing the wordlist
 * for the user averages, we can't perform the sort operation without it
 */

const matchWords = (collectionMatch, searchArray, recipeResult) => {
    // console.log(recipeResult);
    const result = []
    console.log(collectionMatch)
    if (collectionMatch) {
        collectionMatch = collectionMatch.wordList[0];
        let recordFound = {}
        // we map over all the recipe results that was supplied to the function
        recipeResult.map((a) => {
            // We also map over the search query array
            searchArray.map((rec) => {
                //  console.log(a.stopWordsDescription.match(rec))
                //   console.log(a.stopWordsDescription);
                // the condition checks that the current search word in the loop matches
                // the values in the stopWordDescription for the currently checked recipe
                // It also checks if collectionMatch object has the search query in its key.
                if (a.stopWordsDescription.match(rec) && collectionMatch.hasOwnProperty(rec)) {
                    // this checks that avgScore exists has a property on the recordFound
                    // If it exists, we just add the value of collection match for that search query to it
                    // note: collectionMatch is a key-value pair the values are the numbers, so we them here
                    if (recordFound.hasOwnProperty('avgScore')) {
                        recordFound.avgScore += collectionMatch[rec]
                    } else {
                        // If the avgScore property does not exist
                        // We insert it as a new data, also with the recipe info we need on the frontend
                        recordFound.avgScore = collectionMatch[rec]
                        recordFound._id = a.id;
                        recordFound.recipeName = a.recipeName;
                        recordFound.recipeURL = a.recipeURL;
                    }
                }
            })
            // Here, instead of pushing an empty object thereby causing empty object to be returned to the frontend,
            // we check the length of the object coming in and if its empty,
            // instead of just pushing emtpy object, we add the property we need and set the avgScore to 0.
            if (!Object.keys(recordFound).length) {
                recordFound = {
                    avgScore: 0,
                    recipeName: a.recipeName,
                    recipeURL: a.recipeURL,
                    '_id': a.id
                }
            }
            result.push(recordFound);
            recordFound = {}
        })
        console.log(result)
        return result.sort((a, b) => parseFloat(b.avgScore) - parseFloat(a.avgScore));
    } else {
        return recipeResult;
    }
}

/**
 * Route to get all recipes
 */

const filterRecipeComments = (searchQuery, recipeData) => {
    let result = [];
    // loop over the searchQuery array
    searchQuery.map((searchQuery) => {
        //We filter and only return the recipe that the comments text matches the current search query in the loop
        recipeData.filter((data) => {
            return data.comments.filter((comment) => {
                if (comment.text.match(searchQuery)) {
                    result.push(data)
                }
            })
        })
    })

    return result;
}

app.get("/recipes", function (req, res) {
    var recipeFound = false;
    Recipe.find().populate('comments').exec(function (err, result) {
            if (req.query.search) {
                const words = req.query.search.trim().split(' ');
                var searchWord = stopWord.removeStopwords(words, stopWords);
                console.log("=====", searchWord, "======");
                const commentsResult = filterRecipeComments(searchWord, result);
                if (searchWord.length !== 0) {
                    for (var i = 0; i < searchWord.length; i++) {
                        let recipeData = [];
                        const regex = new RegExp(escapeRegex(searchWord[i]), 'gi')
                        console.log("2");
                        return Recipe.find(
                            {
                                $or: [{recipeName: regex}, {recipeInstructions: regex}, {stopWordsDescription: regex}]
                            }, function (error, recipes) {
                                if (error) {
                                    console.log(error);
                                } else {
                                    let allRecipeData;
                                    recipeData = recipes;
                                    const mergedData = lodash.union(recipeData, commentsResult, '_id')
                                    if (mergedData.length) {
                                        if (req.query.userId) {
                                            AverageUserProfile.findOne({userId: req.query.userId}).exec(function (err, result) {
                                                allRecipeData = matchWords(result, searchWord, mergedData)
                                                req.flash("success", "Displaying search results");
                                                res.render("recipes", {
                                                    recipes: allRecipeData,
                                                    success: req.flash("success")
                                                });
                                            })
                                        } else {
                                            allRecipeData = mergedData;
                                            recipeData = recipes;
                                            req.flash("success", "Displaying search results");
                                            recipeFound = true;
                                            console.log("-----------------", allRecipeData);
                                            res.render("recipes", {
                                                recipes: allRecipeData,
                                                success: req.flash("success")
                                            });
                                        }
                                    } else {
                                        req.flash("error", "No search results found, displaying all recipes");
                                        res.redirect("/recipes");
                                    }
                                }
                            })
                    }
                } else {
                    const regex = new RegExp((' '), 'gi');
                    Recipe.find({$or: [{recipeName: regex}, {recipeInstructions: regex}, {stopWordsDescription: regex}]}, function (error, recipes) {
                        if (error) {
                            console.log(error);
                        } else {
                            req.flash("error", "No search results found, displaying all recipes");
                            res.redirect("/recipes");
                        }
                    })
                }
            } else {
                Recipe.find({}, function (error, recipes) {
                    if (error) {
                        console.log(error);
                    } else {
                        res.render("recipes", {recipes: recipes});
                    }
                });
            }
        }
    )
});

/**
 * Details of a recipe
 */

app.get("/recipes/:id", function (req, res) {
    Recipe.findById(req.params.id).populate("comments likes").exec(function (err, result) {
        if (err) {
            console.log(err);
        } else {
            res.render("recipedetails", {result: result});
        }
    });
});

/**
 * Edit Recipe
 */

app.get("/recipes/:id/edit", checkRecipeOwner, function (req, res) {
    var id = req.params.id;
    conn.collection("recipesDetails").find({'_id': ObjectId(id)}).toArray(function (err, result) {
        res.render("editrecipe", {result: result});
    });
})

/**
 * Put for Edit Recipe
 */

app.put("/recipes/:id", isLoggedIn, function (req, res) {
    Recipe.findByIdAndUpdate(req.params.id, req.body.recipe, function (err, update) {
        if (err) {
            res.redirect("/recipes")
        } else {
            req.flash("success", "Recipe has been updated")
            res.redirect("/recipes/" + req.params.id);
        }
    })
});

/**
 * Delete recipes
 */

app.delete("/recipes/:id", checkRecipeOwner, function (req, res) {
    var id = req.params.id;
    Recipe.deleteOne({'_id': ObjectId(id)}, function (error, result) {
        if (error) {
            res.redirect("/recipes");
        } else {
            req.flash("success", "Recipe is successfully deleted")
            res.redirect("/recipes");
        }
    });
})

/**
 * Add new comment
 */

app.get("/recipes/:id/comments/new", isLoggedIn, function (req, res) {
    Recipe.findById(req.params.id, function (err, result) {
        if (err) {
            console.log(err);
        } else {
            res.render("newcomment", {result: result});
        }
    });
})

app.post("/recipes/:id/comments", isLoggedIn, function (req, res) {
    Recipe.findById(req.params.id, function (err, result) {
        if (err) {
            console.log(err)
            res.redirect("/recipes")
        } else {
            Comment.create(req.body, function (err, comment) {
                if (err) {
                    console.log(err)
                } else {
                    comment.author.id = req.user._id;
                    comment.author.username = req.user.username;
                    comment.save();
                    result.comments.push(comment);
                    result.save();
                    req.flash("success", "Tag added successfully")
                    res.redirect("/recipes/" + req.params.id);
                }
            });
        }
    });
})

/**
 * Auth - Login Page
 */

app.get("/login", function (req, res) {
    res.render("login");
})

app.post("/login", passport.authenticate("local",
    {
        successRedirect: "/recipes",
        failureRedirect: "/login"
    }), function (req, res) {
});

/**
 * Auth - Registration page
 */

app.get("/register", function (req, res) {
    res.render("register");
})

app.post("/register", function (req, res) {
    var newUser = new User({username: req.body.username});
    User.register(newUser, req.body.password, function (err, user) {
        if (err) {
            req.flash("error", "A user by that username already exists");
            res.render("register", {error: req.flash("error")});
        }
        passport.authenticate("local")(req, res, function () {
            req.flash("success", "Registration successful, Welcome to RecipeBook")
            res.redirect("/recipes");
        });
    });
});

/**
 * Auth - Logout page
 */

app.get("/logout", function (req, res) {
    req.logout();
    req.flash("success", "You are logged out now!");
    res.redirect("/recipes");
})

/**
 * Middleware
 */

function isLoggedIn(req, res, next) {
    if (req.isAuthenticated()) {
        return next();
    } else {
        req.flash("error", "Please login first");
        res.redirect("/login");
    }
}

/**
 * Editing Comments
 */

app.get("/recipes/:id/comments/:comment_id/edit", checkCommentOwner, function (req, res) {
    Comment.findById(req.params.comment_id, function (err, foundComment) {
        if (err) {
            res.redirect("back");
        } else {
            res.render("editcomment", {recipe_id: req.params.id, comment: foundComment});
        }
    })
})

/**
 * Updating comments after editing
 */

app.put("/recipes/:id/comments/:comment_id", function (req, res) {
    Comment.findByIdAndUpdate(req.params.comment_id, req.body.comment, function (err, updatedComment) {
        if (err) {
            res.redirect("back");
        } else {
            req.flash("success", "Comment has been updated");
            res.redirect("/recipes/" + req.params.id);
        }
    })
})

/**
 * Delete Comments
 */

app.delete("/recipes/:id/comments/:comment_id", checkCommentOwner, function (req, res) {
    Comment.findByIdAndRemove(req.params.comment_id, function (err) {
        if (err) {
            res.redirect("back");
        } else {
            req.flash("success", "Comment is successfully deleted");
            res.redirect("/recipes/" + req.params.id);
        }
    });
})

/**
 * Check Recipe Ownership
 */

function checkRecipeOwner(req, res, next) {
    var id = req.params.id;
    if (req.isAuthenticated()) {
        conn.collection("recipesDetails").find({'_id': ObjectId(id)}).toArray(function (err, result) {
            if (err) {
                req.flash("error", "Recipe not found");
                res.redirect("back");
            } else {
                if (result[0].author.id.equals(req.user._id)) {
                    next();
                } else {
                    req.flash("error", "You don't have permission");
                    res.redirect("back");
                }
            }
        });
    } else {
        req.flash("error", "Please login");
        res.redirect("back");
    }
}

/**
 * Check comment Ownership
 */

function checkCommentOwner(req, res, next) {
    if (req.isAuthenticated()) {
        Comment.findById(req.params.comment_id, function (err, foundComment) {
            if (err) {
                res.redirect("back");
            } else {
                if (foundComment.author.id.equals(req.user._id)) {
                    next();
                } else {
                    res.redirect("back");
                }
            }
        });
    } else {
        res.redirect("back");
    }
}

/**
 * User Profile
 */

app.get("/dashboard", isLoggedIn, function (req, res) {
    User.find({}, function (error, users) {
        if (error) {
            console.log(error);
        } else {
            Comment.find({}, function (error, comments) {
                if (error) {
                    console.log(error);
                } else {
                    Recipe.find({}, function (error, recipes) {
                        if (error) {
                            console.log(error)
                        } else {
                            res.render("dashboard", {users: users, comments: comments, recipes: recipes});
                        }
                    })
                }
            })
        }
    });
})

/**
 * Like Recipe
 *
 */

app.post("/recipes/:id/liked", function (req, res) {
    Recipe.findByIdAndUpdate(req.params.id, {$inc: {likes: 1}}, function (err, update) {
        if (err) {
            res.redirect("/recipes")
        } else {
            req.flash("success", "You have liked this recipe")
            res.redirect("/recipes/" + req.params.id, {success: req.flash("success")});
        }
    })
})

/**
 * Upvote recipe
 */

app.post("/recipes/:id/upvoted", function (req, res) {
    Recipe.findByIdAndUpdate(req.params.id, {$inc: {upvotes: 1}}, function (err, update) {
        if (err) {
            res.redirect("/recipes")
        } else {
            req.flash("success", "You have upvoted this recipe")
            res.redirect("/recipes/" + req.params.id, {success: req.flash("success")});
        }
    })
})

/**
 * Add a new like
 */

app.post("/recipes/:id/like", isLoggedIn, function (req, res) {
    Recipe.findById(req.params.id, function (err, recipes) {
        if (err) {
            console.log(err);
            res.redirect("/recipes");
        } else {
            recipes.likes.push(req.user);
            recipes.save(function (err) {
                if (err) {
                    console.log(err);
                    return res.redirect("/recipes");
                }
                return res.redirect("/recipes/" + recipes._id);
            })
        }
    });
})

/**
 * Add a new upvote
 */

app.post("/recipes/:id/upvote", isLoggedIn, function (req, res) {
    Recipe.findById(req.params.id, function (err, recipes) {
        if (err) {
            console.log(err);
            res.redirect("/recipes");
        } else {
            recipes.upvotes.push(req.user);
            recipes.save(function (err) {
                if (err) {
                    console.log(err);
                    return res.redirect("/recipes");
                }
                return res.redirect("/recipes/" + recipes._id);
            })
        }
    });
})

/**
 * List of Stop words
 * Source --> https://geeklad.com/remove-stop-words-in-javascript
 */

var stopWords = new Array(
    'a',
    'about',
    'above',
    'across',
    'after',
    'again',
    'against',
    'all',
    'almost',
    'alone',
    'along',
    'already',
    'also',
    'although',
    'always',
    'among',
    'an',
    'and',
    'another',
    'any',
    'anybody',
    'anyone',
    'anything',
    'anywhere',
    'are',
    'area',
    'areas',
    'around',
    'as',
    'ask',
    'asked',
    'asking',
    'asks',
    'at',
    'away',
    'b',
    'back',
    'backed',
    'backing',
    'backs',
    'be',
    'became',
    'because',
    'become',
    'becomes',
    'been',
    'before',
    'began',
    'behind',
    'being',
    'beings',
    'best',
    'better',
    'between',
    'big',
    'both',
    'but',
    'by',
    'c',
    'came',
    'can',
    'cannot',
    'case',
    'cases',
    'certain',
    'certainly',
    'clear',
    'clearly',
    'come',
    'could',
    'd',
    'did',
    'differ',
    'different',
    'differently',
    'do',
    'does',
    'done',
    'down',
    'down',
    'downed',
    'downing',
    'downs',
    'during',
    'e',
    'each',
    'early',
    'either',
    'end',
    'ended',
    'ending',
    'ends',
    'enough',
    'even',
    'evenly',
    'ever',
    'every',
    'everybody',
    'everyone',
    'everything',
    'everywhere',
    'f',
    'face',
    'faces',
    'fact',
    'facts',
    'far',
    'felt',
    'few',
    'find',
    'finds',
    'first',
    'for',
    'four',
    'from',
    'full',
    'fully',
    'further',
    'furthered',
    'furthering',
    'furthers',
    'g',
    'gave',
    'general',
    'generally',
    'get',
    'gets',
    'give',
    'given',
    'gives',
    'go',
    'going',
    'good',
    'goods',
    'got',
    'great',
    'greater',
    'greatest',
    'group',
    'grouped',
    'grouping',
    'groups',
    'h',
    'had',
    'has',
    'have',
    'having',
    'he',
    'her',
    'here',
    'herself',
    'high',
    'high',
    'high',
    'higher',
    'highest',
    'him',
    'himself',
    'his',
    'how',
    'however',
    'i',
    'if',
    'important',
    'in',
    'interest',
    'interested',
    'interesting',
    'interests',
    'into',
    'is',
    'it',
    'its',
    'itself',
    'j',
    'just',
    'k',
    'keep',
    'keeps',
    'kind',
    'knew',
    'am',
    'know',
    'known',
    'knows',
    'l',
    'large',
    'largely',
    'last',
    'later',
    'latest',
    'least',
    'less',
    'let',
    'lets',
    'like',
    'likely',
    'long',
    'longer',
    'longest',
    'm',
    'made',
    'make',
    'making',
    'man',
    'many',
    'may',
    'me',
    'member',
    'members',
    'men',
    'might',
    'more',
    'most',
    'mostly',
    'mr',
    'mrs',
    'much',
    'must',
    'my',
    'myself',
    'n',
    'necessary',
    'need',
    'needed',
    'needing',
    'needs',
    'never',
    'new',
    'new',
    'newer',
    'newest',
    'next',
    'no',
    'nobody',
    'non',
    'noone',
    'not',
    'nothing',
    'now',
    'nowhere',
    'number',
    'numbers',
    'o',
    'of',
    'off',
    'often',
    'old',
    'older',
    'oldest',
    'on',
    'once',
    'one',
    'only',
    'open',
    'opened',
    'opening',
    'opens',
    'or',
    'order',
    'ordered',
    'ordering',
    'orders',
    'other',
    'others',
    'our',
    'out',
    'over',
    'p',
    'part',
    'parted',
    'parting',
    'parts',
    'per',
    'perhaps',
    'place',
    'places',
    'point',
    'pointed',
    'pointing',
    'points',
    'possible',
    'present',
    'presented',
    'presenting',
    'presents',
    'problem',
    'problems',
    'put',
    'puts',
    'q',
    'quite',
    'r',
    'rather',
    'really',
    'right',
    'right',
    'room',
    'rooms',
    's',
    'said',
    'same',
    'saw',
    'say',
    'says',
    'second',
    'seconds',
    'see',
    'seem',
    'seemed',
    'seeming',
    'seems',
    'sees',
    'several',
    'shall',
    'she',
    'should',
    'show',
    'showed',
    'showing',
    'shows',
    'side',
    'sides',
    'since',
    'small',
    'smaller',
    'smallest',
    'so',
    'some',
    'somebody',
    'someone',
    'something',
    'somewhere',
    'state',
    'states',
    'still',
    'still',
    'such',
    'sure',
    't',
    'take',
    'taken',
    'than',
    'that',
    'the',
    'their',
    'them',
    'then',
    'there',
    'therefore',
    'these',
    'they',
    'thing',
    'things',
    'think',
    'thinks',
    'this',
    'those',
    'though',
    'thought',
    'thoughts',
    'three',
    'through',
    'thus',
    'to',
    'today',
    'together',
    'too',
    'took',
    'toward',
    'turn',
    'okay',
    'bye',
    'turned',
    'turning',
    'turns',
    'two',
    'u',
    'under',
    'until',
    'up',
    'upon',
    'us',
    'use',
    'used',
    'uses',
    'v',
    'very',
    'w',
    'want',
    'wanted',
    'wanting',
    'wants',
    'was',
    'way',
    'ways',
    'we',
    'well',
    'wells',
    'went',
    'were',
    'what',
    'when',
    'where',
    'whether',
    'which',
    'while',
    'who',
    'whole',
    'whose',
    'why',
    'will',
    'with',
    'please',
    'within',
    'without',
    'work',
    'worked',
    'working',
    'works',
    'would',
    'x',
    'y',
    'year',
    'recipe',
    'recipes',
    'years',
    'yet',
    'you',
    'young',
    'younger',
    'youngest',
    'your',
    'yours',
    'z',
    'search',
    ' ',
    '  '
)

/**
 * Fuzzy searching with MongoDB
 * Source --> https://stackoverflow.com/questions/38421664/fuzzy-searching-with-mongodb
 * @param text
 * @returns {void | string}
 */

function escapeRegex(text) {
    return text.replace(/[-[\]{}()*+?.,^$|#]/g, " ");
};

/**
 * UserProfileVector
 */

app.get("/userprofilevector", isLoggedIn, function (req, res) {
    Recipe.find().populate("comments likes").exec(function (err, recipes) {
        if (err) {
            console.log(error);
        } else {
            res.render("UserProfileVector", {recipes: recipes});
        }
    });
});

/**
 * Create Suggestions
 */

app.get("/suggestions", isLoggedIn, function (req, res) {

    User.find({}, function (error, users) {
        if (error) {
            console.log(error);
        } else {
            Recipe.find().populate("comments likes").exec(function (err, recipes) {
                if (err) {
                    console.log(error);
                } else {
                    res.render("Suggestions", {recipes: recipes, users: users});
                }
            });
        }
    });
});

/**
 * Calcuate Suggestions and push to Mongo collection
 */

/**
 * This function checks the index at which an element is found in an array of objects.
 * @param array
 * @param id
 */

const getDataFoundIndex = (array, id) => {
    return array.map(function (x) {
        return x._id.toString();
    }).indexOf(id.toString());
}

const calculateSuggestions = (recipeData, usersData) => {
    const usersSuggestions = {};
    // loop over the user data
    usersData.map((a) => {
        //loop over the recipe data
        recipeData.map((recipe) => {
            //we get the index at which a userId exists inside the reciple.likes array
            const foundIndex = getDataFoundIndex(recipe.likes, a._id);
            // copy the initial recipe.likes array to avoid updating it
            const copiedLikes = [...recipe.likes]
            // remove the object containing the current user in the loop for recipe.likes data
            // Since we want to get the likes of the user's mutual likes but not the one they have liked before
            if (foundIndex > -1) {
                copiedLikes.splice(foundIndex, 1);
                if (recipe.likes.length) {
                    // loop over the copied likes
                    copiedLikes.map((like) => {
                        // loop over all recipe data
                        recipeData.map((b) => {
                            // check if the user from the mutual suggestion has liked that recipe before
                            // and the current user has also not liked that same recipe
                            if (getDataFoundIndex(b.likes, like._id) > -1 && getDataFoundIndex(b.likes, a._id) === -1) {
                                // check that userSuggestions has some values already and the userId for the mutual suggestion user exist in userSuggestion
                                if (Object.keys(usersSuggestions).length && usersSuggestions[a._id.toString()]) {
                                    if (usersSuggestions[a._id.toString()].indexOf(b._id.toString()) === -1) {
                                        // insert the recipeId inside the array for the particular user in userSuggestion object
                                        usersSuggestions[a._id.toString()].push(b._id.toString())
                                    }
                                } else {
                                    // Since the userId doesn't currently exist, add it here
                                    usersSuggestions[a._id.toString()] = [b._id.toString()]
                                }
                            }
                        })
                    })
                }
            }
        })
    })
    return usersSuggestions
}

app.get("/calculatesuggestions", function (req, res) {
    User.find({}, '_id', function (error, users) {
        if (error) {
            console.log(error);
        } else {
            Recipe.find().populate("likes").exec(function (err, recipes) {
                if (err) {
                    console.log(error);
                } else {
                    var check = calculateSuggestions(recipes, users);
                    const userIds = Object.keys(check);
                    if (UserSuggestions.find({})) {
                        conn.collection("userSuggestions").drop();
                    }
                    userIds.map((id) => {
                        console.log(check[id], id)
                        return UserSuggestions.create({userId: id, suggestionsList: check[id]})
                    })
                    res.send("Suggestions calculated and pushed to Mongo");
                }
            });
        }
    });
});

/**
 * Route to get suggestions
 */

app.get("/getsuggestions", isLoggedIn, function (req, res) {
    User.find({}, function (error, users) {
        if (error) {
            console.log(error);
        } else {
            UserSuggestions.find({}, function (error, usersuggestions) {
                if (error) {
                    console.log(error);
                } else {
                    Recipe.find({}, function (error, recipes) {
                        if (error) {
                            console.log(error)
                        } else {
                            res.render("Suggestions", {
                                users: users,
                                usersuggestions: usersuggestions,
                                recipes: recipes
                            });
                        }
                    })
                }
            })
        }
    });
})

/**
 * For user profile vector
 */

const calculateAVG = (recipeData, userIds) => {
    let counts = {};
    // Here we get all the userIds from the userData object arrays
    userIds = userIds.map((o) => o._id.toString())
    const main = []
    // loop over the userIds
    userIds.map((id) => {
        //loop over the recipeData
        recipeData.map((recipe) => {
            // we get the index at which the current user in the loop liked the current recipe in the loop
            const foundIndex = recipe.likes.map((a) => a._id.toString()).indexOf(id);
            //if found index > -1 it means the user has liked that recipe
            if (foundIndex > -1) {
                // we split the stopWordsDescription for that recipe by comma which returns an array.
                const splittedStop = recipe.stopWordsDescription.split(',');
                splittedStop.map((a, i) => {
                    // increment the count for that word count if it exist else I just set it to 1
                    counts[a] = counts[a] ? counts[a] + 1 : 1;
                })
                // use this to get the totalLikedRecipe for that particular user
                counts['totalLikedRecipe'] = counts['totalLikedRecipe'] ? counts['totalLikedRecipe'] + 1 : 1;
            }
        })

        // we add a userId set to the id of the current user in the loop
        // we then store that in the main array and reset the count variable to
        // prevent conflict when the loop continues

        counts.userId = id
        main.push(counts)
        counts = {}
    })
    const finalResut = []
    let resultObject = {};
    // loop over the main array containing all the words and the counts of occurence
    main.map((a) => {
        // get the keys of the current object in the map array
        const objectKeys = Object.keys(a);
        // loop over object keys containing all the keys for the list of words
        const objectValues = Object.values(a)
        const maxNum = Math.max(...objectValues);
        objectKeys.map((c) => {
            if (c !== 'userId') {
                // we calculate the average which is the occurrence of word/total recipe liked by that user
                resultObject[c] = a[c] / a.totalLikedRecipe;
                resultObject.userId = a.userId;
                // we no longer need the totalLikedRecipe value so I delete it
                delete resultObject.totalLikedRecipe;
            }
        })
        // store the result in the finalResult array
        finalResut.push(resultObject)
        resultObject = {}
    })
    return finalResut;
}

app.get("/calculateavg", function (req, res) {
    User.find({}, '_id', function (error, users) {
        if (error) {
            console.log(error);
        } else {
            Recipe.find().populate("comments likes").exec(function (err, recipes) {
                if (err) {
                    console.log(error);
                } else {
                    var check = calculateAVG(recipes, users);
                    if (AverageUserProfile.find({})) {
                        conn.collection("averageUserProfile").drop();
                    }
                    check.map((data) => {
                        return AverageUserProfile.create({userId: data.userId, wordList: data})
                    })
                    res.send("User Vector Calculated and pushed to Mongo");
                }
            });
        }
    });
});

/**
 * App listening port
 */

app.listen(process.env.PORT || 4000, function () {
    console.log("Social Web server started")
})