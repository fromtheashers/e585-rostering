import { offerRole, takeRole, withdrawOffer } from "@/lib/actions";
import { Hidden, offerKey, takeKey, type PaneData } from "./ui";
import { Pending, SaveForm } from "./optimistic";

/**
 * What you can do with an open role. Admins put themselves on it; members offer, and an
 * admin puts them on it. An offer flips to "Offered" the moment it's tapped.
 */
export function OpenRoleAction({
  token,
  meetingId,
  pane,
  organiser,
  offered,
}: {
  token: string;
  meetingId: number;
  pane: PaneData;
  organiser: boolean;
  offered: boolean;
}) {
  const hidden = <Hidden values={{ token, meetingId, roleId: pane.roleId }} />;
  if (organiser) {
    return (
      <SaveForm action={takeRole} keys={[takeKey(meetingId, pane.roleId)]}>
        {hidden}
        <button type="submit" className={`btn sm${pane.required ? " primary" : ""}`}>
          {pane.required ? "Take it" : "I'll do it"}
        </button>
      </SaveForm>
    );
  }
  const key = offerKey(meetingId, pane.roleId);
  const offer = (
    <SaveForm action={offerRole} keys={[key]}>
      {hidden}
      <button type="submit" className={`btn sm${pane.required ? " primary" : ""}`}>
        I can do it
      </button>
    </SaveForm>
  );
  const withdraw = (
    <SaveForm action={withdrawOffer} keys={[key]}>
      {hidden}
      <button type="submit" className="btn sm" aria-label={`Offered for ${pane.roleName}. Tap to withdraw your offer.`}>
        Offered · undo
      </button>
    </SaveForm>
  );
  return (
    <Pending on={key} show={offered ? offer : withdraw}>
      {offered ? withdraw : offer}
    </Pending>
  );
}
