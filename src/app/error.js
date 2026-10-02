'use client';
export default function Error({error}) {
    console.log(error);
  return (
    <div>
        There is an Error
        {error.message}
    </div>
  );
}