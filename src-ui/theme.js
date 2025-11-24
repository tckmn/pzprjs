if (localStorage.getItem('theme') === 'light') {
    document.documentElement.classList.remove('dark');
}
if (localStorage.getItem('pause') === 'xs') {
    document.body.classList.remove('realpause');
    document.body.classList.add('xspause');
}
