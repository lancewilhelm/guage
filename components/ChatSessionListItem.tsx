import DotsIcon from "@/components/icons/Dots";
import TrashCanIcon from "@/components/icons/TrashCan";
import PencilIcon from "@/components/icons/Pencil";
import DropDownMenu, {
  DropDownMenuButton,
  DropDownMenuItem,
  DropDownMenuList,
} from "@/components/DropDownMenu";
import { selectChatSession } from "@/utils/db";

export default function ChatSessionListItem({
  session,
  setCurrentChatSessionId,
  deleteHandler,
}: {
  session: selectChatSession;
  setCurrentChatSessionId: (sessionId: string) => void;
  deleteHandler: (sessionId: string) => void;
}) {
  return (
    <div className="flex justify-between items-center">
      <div
        onClick={() => setCurrentChatSessionId(session.id)}
        className="cursor-pointer hover:opacity-80"
      >
        {session.title}
      </div>
      <DropDownMenu>
        <DropDownMenuButton>
          <DotsIcon fill="var(--main-color)" />
        </DropDownMenuButton>
        <DropDownMenuList align="right">
          <DropDownMenuItem
            onClick={() => {
              console.log("renaming");
            }}
          >
            <div className="grid grid-cols-[20px_auto] items-center ">
              <PencilIcon fill="var(--main-color)" />
              Rename
            </div>
          </DropDownMenuItem>
          <DropDownMenuItem
            onClick={() => {
              console.log("trashing");
            }}
          >
            <div
              className="grid grid-cols-[20px_auto] items-center text-(--error-color)"
              onClick={() => deleteHandler(session.id)}
            >
              <TrashCanIcon
                fill="var(--error-color)"
                className="translate-y-[-1px]"
              />
              Trash
            </div>
          </DropDownMenuItem>
        </DropDownMenuList>
      </DropDownMenu>
    </div>
  );
}
