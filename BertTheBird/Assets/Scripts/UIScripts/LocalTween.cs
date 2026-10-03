using UnityEngine;
using System.Collections;


[RequireComponent(typeof(TweenPosition))]


public class LocalTween : MonoBehaviour {
	public bool hidden = false;
	TweenPosition tp;
	public float offset = 150f;
	public float duration = 1f;
	public Orientation direction;
	bool PositionSet = false;
	float orgx;
	float orgy;
	float newx;
	float newy;


	void Awake () {
		tp = GetComponent<TweenPosition> ();
		tp.duration = duration;
	}

	void Start () {
		if (hidden) {
			NGUITools.SetActive(gameObject, false);
		}
	}

	public void Hide () {
		if (!hidden) {

			if (!PositionSet)
				SetPositions();

			tp.from.Set (orgx, orgy, 0);
			tp.to.Set (newx, newy, 0);
			tp.ResetToBeginning();
			tp.PlayForward ();
			hidden = true;

		}
	}

	public void Show () {
		//gameObject.SetActive(true);
		//NGUITools.SetActive(gameObject, true);
		if (hidden) {
			//gameObject.SetActive(true);
			NGUITools.SetActive(gameObject, true);


			if (!PositionSet)
				SetPositions();

			tp.from.Set (newx, newy, 0);
			tp.to.Set (orgx, orgy, 0);
			tp.ResetToBeginning();
			tp.PlayForward ();
			hidden = false;

		}
	}

	public void Toggle () {
		if (hidden) 
			Show ();
		else
			Hide();
	}

	void SetPositions() {
		if (!hidden) {
			orgx = transform.localPosition.x;
			orgy = transform.localPosition.y;
			newx = orgx + (direction == Orientation.Horisontal ? offset : 0);
			newy = orgy + (direction == Orientation.Vertical ? offset : 0);
		} else {
			newx = transform.localPosition.x;
			newy = transform.localPosition.y;
			orgx = newx - (direction == Orientation.Horisontal ? offset : 0);
			orgy = newy - (direction == Orientation.Vertical ? offset : 0);
		}
		PositionSet = true;
	}

	public void Disable() {
		if (hidden) {
			NGUITools.SetActive (gameObject, false);
		}
	}
}
