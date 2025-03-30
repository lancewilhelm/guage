import { SVGProps } from "react";

export function Fa6RegularSquare(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="0.88em"
      height="1em"
      viewBox="0 0 448 512"
      {...props}
    >
      {/* Icon from Font Awesome Regular by Dave Gandy - https://creativecommons.org/licenses/by/4.0/ */}
      <path
        fill={props.fill}
        d="M384 80c8.8 0 16 7.2 16 16v320c0 8.8-7.2 16-16 16H64c-8.8 0-16-7.2-16-16V96c0-8.8 7.2-16 16-16zM64 32C28.7 32 0 60.7 0 96v320c0 35.3 28.7 64 64 64h320c35.3 0 64-28.7 64-64V96c0-35.3-28.7-64-64-64z"
      ></path>
    </svg>
  );
}
export default Fa6RegularSquare;
