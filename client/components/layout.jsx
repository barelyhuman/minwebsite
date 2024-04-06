export function Layout ({ children }) {
  return (
    <>
      <header class='sticky top-0 z-10 mb-10 border-b backdrop-filter backdrop-blur-lg bg-zinc-900/90 border-b-zinc-900'>
        <nav class='flex gap-6 justify-between items-center px-16 py-3 mx-auto'>
          <div class='flex items-center'>
            <form>
              <input
                class='text-white rounded-md border border-overlay bg-overlay focus:border focus:border-white'
                type='search'
                placeholder='Search'
              />
            </form>
          </div>
          <div class='flex justify-self-end items-center'>
            <ul class='flex gap-6 justify-end items-center text-sm font-base'>
              <li>
                <a href='/'>Home</a>
              </li>
              <li>
                <a href='/about'>About</a>
              </li>
              <li>
                <a href='/login'>Login</a>
              </li>
            </ul>
          </div>
        </nav>
      </header>
      <div class='p-2 rounded-sm sm:m-1 md:m-10'>{children}</div>
    </>
  )
}
