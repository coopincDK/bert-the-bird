using UnityEngine;
using System.Collections;

public class NGUIToggle : MonoBehaviour {
	[HideInInspector]
	bool On = true;
	float offset;
	public Transform Thumb;
	public Color OnColor;
	public Color OffColor;
	public string OnText;
	public string OffText;
	public bool AutoToggle = true;
	UILabel Text;
	TweenPosition ThumbPosition;
	TweenColor ThumbColor;

	void Awake() {
		Text = Thumb.Find("Text").GetComponent<UILabel> ();
		ThumbPosition = Thumb.GetComponent<TweenPosition> ();
		ThumbPosition.from.Set (ThumbPosition.transform.localPosition.x, 0, 0);
		ThumbPosition.to.Set (-ThumbPosition.transform.localPosition.x, 0, 0);
		ThumbColor = Thumb.GetComponent<TweenColor> ();
		ThumbColor.from = OnColor;
		ThumbColor.to = OffColor;

	}


	public void Toggle() {
		if (AutoToggle) {
			if (On)
				SetOn(false);
			else
				SetOn(true);
		}
	}

	public void SetOn(bool Enabled) {
		if (Enabled) {
			ThumbPosition.PlayReverse();
			ThumbColor.PlayReverse();
			Text.text = OnText;
			On = true;
		} 
		else {
			ThumbPosition.PlayForward();
			ThumbColor.PlayForward();
			Text.text = OffText;
			On = false;
		}

	}
}
