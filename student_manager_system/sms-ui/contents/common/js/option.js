function ChangeTab(No) {
  var x = 21; 
  for (var i = 0; i+1 < No; i++ )
  {
    x += document.getElementsByClassName("tab_menu")[i].clientWidth+1;
  }
  // alert(x);
  document.getElementsByClassName("test1")[0].style.display= "block";
  document.getElementsByClassName("test1")[0].style.left = String(x) + "px";
  document.getElementsByClassName("test1")[0].textContent= document.getElementsByClassName("tab_menu")[No-1].textContent;

  for (var i = 0; i < document.getElementsByClassName("tab_content").length ; i++ )
  {
   document.getElementsByClassName("tab_content")[i].style.display = "none";
 }
 document.getElementsByClassName("tab_content")[No-1].style.display = "block";

}