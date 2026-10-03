using UnityEngine;
using System.Collections;

public class FixWidth : MonoBehaviour {
	public bool CenterOnStartUp = false;
	public bool isPanel = false;
	float defautWidth;
	public float delay = 0.05f;
	// Use this for initialization

	void Awake() {
		if (CenterOnStartUp) {
			transform.localPosition = Vector3.zero;
		}
	}
	void Start () {
		Invoke ("setWidth", delay);
		//setWidth ();
	}
	
	void setWidth() {
		if (!isPanel)
			defautWidth = GetComponent<UIWidget> ().width;
		else
			defautWidth = GetComponent<UIPanel> ().width;

		double originalAspect = 1.77778d; // = 16/9
		double currentAspect = System.Math.Round((double)Screen.width / (double)Screen.height,5);
		
		if (currentAspect != originalAspect) {
			if (!isPanel)
				GetComponent<UIWidget> ().width = (int)(defautWidth * (currentAspect / originalAspect));
			//else 
			//	GetComponent<UIPanel> ().width = (int)(defautWidth * (currentAspect / originalAspect));	
		}
	}
}
