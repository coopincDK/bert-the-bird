using UnityEngine;
using System.Collections;

public class PopupPanel : MonoBehaviour {

	// Use this for initialization
	void Start () {
		//NGUITools.SetActive (gameObject, false);
		setWidth ();
		transform.localPosition = Vector3.zero;
	}
	

	public void Show() {
		NGUITools.SetActive (gameObject, true);

	}


	void setWidth() {
		float defautWidth = GetComponent<UIWidget> ().width;
		double originalAspect = 1.77778d; // = 16/9
		double currentAspect = System.Math.Round((double)Screen.width / (double)Screen.height,5);
		
		if (currentAspect != originalAspect) {
			GetComponent<UIWidget> ().width = (int)(defautWidth * (currentAspect / originalAspect));
		}
	}
}
