$(document).ready(function() {

  let timer, spacer, interval;

  $('.add-cash').hide();
  $('#open-pack').attr('disabled', 'disabled');
  loadCards('SM12');
  changeTimer();
  changeSpacer();
  revealMoney();

  /**
   * @see https://www.geeksforgeeks.org/how-to-change-the-time-interval-of-setinterval-method-at-runtime-using-javascript/
   */
  function revealMoney() {
    clearInterval(interval);

    if (!$('.add-cash').is(':visible')) {
      $('.add-cash').css('margin-left', spacer);
      $('.add-cash').show();
    }

    changeTimer();
    changeSpacer();
    interval = setInterval(revealMoney, timer);
  }

  function changeTimer() {
    timer = Math.random() * 10000;
  }
  function changeSpacer() {
    spacer = Math.floor(Math.random() * 300);
  }
});

