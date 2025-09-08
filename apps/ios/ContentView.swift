import SwiftUI
import MapKit

struct ContentView: View {
  @State private var position: MapCameraPosition = .region(.init(center: .init(latitude: 37.7749, longitude: -122.4194), span: .init(latitudeDelta: 0.2, longitudeDelta: 0.2)))
  var body: some View {
    TabView {
      Map(position: $position)
        .tabItem { Label("Explore", systemImage: "map") }
      Text("Feed (coming soon)")
        .tabItem { Label("Feed", systemImage: "play.rectangle") }
      Text("Create")
        .tabItem { Label("Create", systemImage: "camera") }
      Text("Trips")
        .tabItem { Label("Trips", systemImage: "calendar") }
      Text("Profile")
        .tabItem { Label("Profile", systemImage: "person.circle") }
    }
  }
}

#Preview { ContentView() }
