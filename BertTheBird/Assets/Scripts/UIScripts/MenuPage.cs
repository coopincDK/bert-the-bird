using UnityEngine;
using System.Collections;


[RequireComponent(typeof(TweenPosition))]

public class MenuPage : MonoBehaviour {
	public bool StartEnabled = false;
	TweenPosition TweenPosition;

	public int Index;
	public Vector2 DefaultPosition;
	public Vector2 StartPosition;
	public Vector2 EndPosition;

	public SocialButton Facebook;
	public SocialButton Twitter;

	public UIWidget ContentContainer;
	
	bool Visible = false;

	void Awake () {
		if (Index == 1)
			Statics.CurrentMenuPage = this;
		TweenPosition = GetComponent<TweenPosition> ();
		TweenPosition.duration = 0.5f;
		TweenPosition.enabled = false;
	}

	void Start () {
		if (!StartEnabled)
			NGUITools.SetActive (gameObject, false);

		setWidth ();
	}

	public void Show () {
		if (!Visible) {
			Visible = true;
			NGUITools.SetActive (gameObject, true);
			int PrevIndex = Statics.CurrentMenuPage.Index;
			bool MoveRight = PrevIndex > Index;

			if (MoveRight) 
				TweenPosition.from.Set (StartPosition.x, StartPosition.y, 0);
			else
				TweenPosition.from.Set (EndPosition.x, EndPosition.y, 0);

			TweenPosition.to.Set (DefaultPosition.x, DefaultPosition.y, 0);
			Animate ();

			if (Statics.CurrentMenuPage != this) {
				Statics.CurrentMenuPage.Hide (MoveRight);
			}

			Statics.CurrentMenuPage = this;

			if (Facebook != null)
				Facebook.Play();
			if (Twitter != null)
				Twitter.Play();
		}
	}

	public void Show (bool instant) {
		Visible = true;
		NGUITools.SetActive (gameObject, true);
		transform.localPosition = DefaultPosition;
	}
	
	public void Hide () {
		Hide (true);
	}

	public void Hide (bool Right) {
		Visible = false;
		TweenPosition.from.Set (DefaultPosition.x, DefaultPosition.y, 0);
		if (Right)
			TweenPosition.to.Set (EndPosition.x, EndPosition.y, 0);
		else 
			TweenPosition.to.Set (StartPosition.x, StartPosition.y, 0);
		Animate ();
		StopSocial ();
	}


	public void Disable(){
		if (!Visible) {
			NGUITools.SetActive (gameObject, false);
		}
	}

	void Animate() {
		TweenPosition.ResetToBeginning ();
		TweenPosition.PlayForward ();
	}

	void StopSocial() {
		if (Facebook != null)
			Facebook.Stop();
		if (Twitter != null)
			Twitter.Stop();
	}

	void setWidth() {
		if (ContentContainer != null) {
			float defautWidth = ContentContainer.width;
			double originalAspect = 1.77778d; // = 16/9
			double currentAspect = System.Math.Round((double)Screen.width / (double)Screen.height,5);

			if (currentAspect != originalAspect) {
				ContentContainer.width = (int)(defautWidth * (currentAspect / originalAspect));
			}
		}
	}
	


}
