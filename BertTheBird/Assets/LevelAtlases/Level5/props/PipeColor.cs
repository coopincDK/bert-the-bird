using UnityEngine;
using System.Collections;

[System.Serializable]
public struct PipeSprites {
	public Sprite Top;
	public Sprite Pipe;
}


public class PipeColor : MonoBehaviour {
	public SpriteRenderer[] PipeTops;
	public SpriteRenderer[] Pipes;
	public PipeSprites[] Colors; 

	void OnEnable() {
		PipeSprites SelectedColor = Colors[Random.Range (0, Colors.Length)];
		for (int i = 0; i < PipeTops.Length; i++) {
			PipeTops[i].sprite = SelectedColor.Top;
		}
		for (int i = 0; i < Pipes.Length; i++) {
			Pipes[i].sprite = SelectedColor.Pipe;
		}
	}
}
