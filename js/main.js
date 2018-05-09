
const USERNAME = 'sambillingham';
const TAG = 'steepshot'
let query = { 'tag': TAG, 'limit': 7 }
let converter = new showdown.Converter({ tables: true })
let allContent = []
let allUsers = []
let msnry;
let $gallery = $('.gallery')

if ( $('main').hasClass('feeds') ) {
  getLatest(query, true)
}

if ( $('main').hasClass('profile') ) {
  query = { 'tag': USERNAME, 'limit': 14 }
  getBlog(query, true)
}

$('.gallery').on('click', '.item', (e) => {
    loadPost(e.currentTarget)
})

$('.faq').on('click', (e) => {
    e.preventDefault()
    lastTop = $(window).scrollTop();
    $('body').addClass( 'noscroll' ).css( { top: -lastTop } )
    $('.overlay, .overlay__faq, .overlay__bg').addClass('overlay--active')
})

$('.nav__link').on('click', (e) => {
  let filter = $(e.currentTarget).data('filter');
  $('.nav__link').removeClass('nav__link--active');
  $(e.currentTarget).addClass('nav__link--active');
  $('.gallery').empty()
  allContent = []

  if(filter === 'trending'){
    getTrending(query, true)
  } else {
    getLatest(query, true)
  }
})

$('.overlay__bg').on('click', () => {
  $('body').removeClass('noscroll')
  $(window).scrollTop( lastTop );
  $('.overlay, .overlay__bg, .overlay__content, .overlay__faq').removeClass('overlay--active')
})

function getTrending(query, initial, callback){

  steem.api.getDiscussionsByTrending(query, (err, result) => {
    if (err === null) {
      displayImages(result, initial, initial ? false : callback)
      getaccounts(result.map(post => post.author))
    } else {
      console.log(err);
    }
  });
}

function getLatest(query, initial, callback){

  steem.api.getDiscussionsByCreated(query, (err, result) => {
    if (err === null) {
      displayImages(result, initial, initial ? false : callback)
      getaccounts(result.map(post => post.author))
    } else {
      console.log(err);
    }
  });
}

function getBlog(query, initial, callback){
  steem.api.getDiscussionsByBlog(query, (err, result) => {
    if (err === null) {
      result = result.filter(post => {
        let tags = JSON.parse(post.json_metadata).tags
        console.log(post)
        if( tags.includes(TAG) || post.parent_permlink === TAG ) return post
      })
      displayImages(result, initial, initial ? false : callback)
      getaccounts(result.map(post => post.author))
    } else {
      console.log(err);
    }
  });
}

function getMoreContent(){
  let lastItem = allContent[allContent.length - 1]
  let filter = $('.nav__link--active').data('filter')
  let query = {
      'tag':
      'photofeed',
      'limit': 24,
      start_author: lastItem.author,
      start_permlink: lastItem.permlink }

      let callback = (items) => {
          items.forEach((item) => {
              let $item = $(item)
              $gallery.append($item)

              $item.children('img').on('load', (e) => {
                $(e.currentTarget).parent().removeClass('hidden')
                $gallery.masonry( 'appended', $(e.currentTarget).parent())
              })
          })
          setInfiniteScrollPoint()
      }

      if(filter === 'trending'){
        getTrending(query, false, callback)
      } else if (filter === 'latest')  {
        getLatest(query, false, callback)
      } else {
        query = {
            'tag':
            USERNAME,
            'limit': 24,
            start_author: lastItem.author,
            start_permlink: lastItem.permlink }
        getBlog(query, false, callback)
      }

}


function getaccounts(usernames){
  steem.api.getAccounts(usernames, (err, result) => {
    allUsers = allUsers.concat(result)
  })
}

function displayImages(result, initialLoad, callback){
  let items = []
  for (let i = 0; i < result.length ; i++) {
      let post = result[i];

      var urlRegex = /(https?:\/\/[^\s]+)/g;
      post.body = post.body.replace(urlRegex, (url) => {
        let last = url.slice(-3)
        if(last === 'jpg' || last === 'png' || last === 'jpe' || last === 'gif')  {
          return '<img src="' + url + '">';
        } else {
          return url
        }
      })

      if( typeof JSON.parse(post.json_metadata).image === 'undefined' ){
        image = genImageInHTML(post.body)
      } else {
        image = JSON.parse(post.json_metadata).image[0]
      }

      allContent.push(post);
      let itemTemplate = `
        <div class="item hidden" data-url="${post.url}" data-permlink="${ post.permlink }">
          <img class="item__image " src="https://steemitimages.com/480x768/${image}" onerror="this.src='http://placehold.it/500x500'">
          <div class="item__photographer">
            <span>@${post.author}</span>
          </div>
          <div class="item__like">
            <span class="item__heart">♥</span>
            <span class="item__heart-count">${post.net_votes}</span>
          </div>
          <div class="item__overlay"></div>
        </div>
        `
      items.push(itemTemplate)
  }
  if(initialLoad){
    checkImages(items)
  } else {
    items.shift()
    callback(items)
  }
}

function genImageInHTML(markdown){
    let placeholder = document.createElement('div');
    placeholder.innerHTML = converter.makeHtml(markdown)
    let image = placeholder.querySelector('img');
    return image ? image.src : ''
}

function checkImages(items){

  items.forEach((item) => {
    $gallery.append(item);
  })

  let images = $('img.item__image');
  let loaded = 0;

  images.on('load',() => {
    loaded++;
    if (loaded == images.length )
        initMasonry(images)
  });
}

function initMasonry(images){
  images.parent().removeClass('hidden')

  if( $('.gallery').data('masonry') ) $gallery.masonry('destroy')

  $gallery.masonry({
    itemSelector: '.item',
    columnWidth: '.item',
    gutter: 16,
    percentPosition: true
  });
  setInfiniteScrollPoint()
}

function setInfiniteScrollPoint(){
  $('.item').last().on('inview', function(event, isInView) {
    if (isInView) {
      getMoreContent()
      $('.item').last().off('inview')
    }
  });
}

function loadPost(item) {
  let post = $(item).data()
  let rawPost = allContent.filter( x  => x.permlink === post.permlink )[0]
  let allCopy = allUsers.map(x => Object.assign({}, x))
  let user = allCopy.filter( x  => x.name === rawPost.author )[0]

  let profileImage = 'img/default-user.jpg';

  try {

    if (user.json_metadata == '' ||
    user === undefined ||
    user.json_metadata == 'undefined' ||
    user.json_metadata === undefined ) {
      user.json_metadata = { profile_image : ''}
    } else {
      user.json_metadata = JSON.parse(user.json_metadata).profile
    }

    if (user.json_metadata === undefined){
      user.json_metadata = { profile_image : ''}
    }
    profileImage = user.json_metadata.profile_image ? 'https://steemitimages.com/128x128/' + user.json_metadata.profile_image : '';

  } catch(err){
    console.log(err)
  }

  let html = converter.makeHtml(rawPost.body)
  html = html.replace('<p><br></p>', '')
  html = html.replace('<p></p>', '')

  lastTop = $(window).scrollTop();

  $('body').addClass( 'noscroll' ).css( { top: -lastTop } )

  let tags = JSON.parse(rawPost.json_metadata).tags.reduce( (all,tag) => all + `<span>${tag}</span>`, '')
  let header = `
  <div class="overlay__mata cf">
    <div class="overlay__author">
      <img class="overlay__author-img" width="35" height="35" src="${profileImage}">
      <div class="overlay__author-info">
        <span class="overlay__author-name">${( user.json_metadata.name ?  user.json_metadata.name : user.name ) }</span>
        <a href="profile.html?photographer=${user.name}"class="overlay__author-username">@${user.name}</a>

      </div>
    </div>
    <div class="overlay__tags">${tags}</div>
  </div>
    <h1 class="overlay__title title">${rawPost.title}</h1>
    <hr class="overlay__border">
  `
  let comments = `<section class="finally-comments" data-id="https://steemit.com/${post.url}" data-reputation="true" data-values="true" data-profile="true"></section>`
  $('.overlay__content').empty()
  $('.overlay__content').append(header + html + comments)
  $('.overlay, .overlay__bg, .overlay__content').addClass('overlay--active')

  finallyCommentsSystem.init()
  $('.overlay').scrollTop(0)
}

function uniqueArray(arrArg) {
  return arrArg.filter(function(elem, pos,arr) {
    return arr.indexOf(elem) == pos;
  });
};
