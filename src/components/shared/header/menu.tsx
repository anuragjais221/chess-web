import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { EllipsisVertical, UserIcon } from 'lucide-react';
import Link from 'next/link';
import ModeToggle from './mode-toggle';

const Menu = () => {
    return ( 
        <div className="flex justify-end gap-3">
            <nav className="hidden md:flex w-full max-w-xs gap-1">
                <ModeToggle />
                <Button render={<Link href='/sign-up'/>} nativeButton={false} variant='ghost'> 
                    <UserIcon /> Sign Up
                </Button>
                <Button render={<Link href='/sign-in' />} nativeButton={false} >
                    <UserIcon /> Sign In
                </Button>
            </nav>
            <nav className='md:hidden'>
                <Sheet>
                    <SheetTrigger className='align-middle'>
                        <EllipsisVertical />
                    </SheetTrigger>
                    <SheetContent className='flex flex-col items-start'>
                        <SheetTitle>Menu</SheetTitle>
                        <ModeToggle />
                        <Button render={<Link href='/sign-up'/>} nativeButton={false} variant='ghost'>
                            <UserIcon /> Sign Up
                        </Button>
                        <Button render={<Link href='/sign-in' />} nativeButton={false} >
                            <UserIcon /> Sign In
                        </Button>
                        {/* <SheetDescription></SheetDescription> */}
                    </SheetContent>
                </Sheet>

            </nav>
        </div>
    )
}

export default Menu;